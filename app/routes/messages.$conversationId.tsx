import { Form, Link, useLoaderData, useFetcher } from "react-router";
import { useState, useEffect, useCallback, useRef } from "react";
import type { Route } from "./+types/messages.$conversationId";
import { requireUserId } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { uploadFileToCloudinary } from '~/lib/cloudinary.server';
import { emitToConversation } from "~/lib/realtime.server";
import { MessageThread } from "~/components/messages/message-thread";
import { MessageInput } from "~/components/messages/message-input";
import { useMessageListener, useMessaging, useSocket } from "~/hooks/use-socket";
import type { MessageWithSender } from "~/types/db";

export async function loader({ request, params }: Route.LoaderArgs) {
  const userId = await requireUserId(request);
  const { conversationId } = params;
  const url = new URL(request.url);
  const cursor = url.searchParams.get('cursor');
  const MESSAGES_PER_PAGE = 20; // Reduced for better lazy loading

  const conversation = await db.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) {
    throw new Response("Conversation not found", { status: 404 });
  }

  // Verify user is a participant
  if (!conversation.participantIds.includes(userId)) {
    throw new Response("Unauthorized", { status: 403 });
  }

  // Fetch messages with cursor-based pagination (newest first, then older)
  const whereClause: any = {
    conversationId,
    ...(cursor && { sentAt: { lt: new Date(cursor) } }), // Load messages older than cursor
  };

  const messages = await db.message.findMany({
    where: whereClause,
    orderBy: { sentAt: 'desc' }, // Newest first
    take: MESSAGES_PER_PAGE + 1, // Take one extra to check if there are more older messages
    include: {
      sender: {
        select: {
          id: true,
          displayName: true,
          profilePhotoUrl: true,
        },
      },
    },
  });

  const hasMore = messages.length > MESSAGES_PER_PAGE;
  const paginatedMessages = hasMore ? messages.slice(0, MESSAGES_PER_PAGE) : messages;
  
  // Reverse the messages so oldest appears at top, newest at bottom for display
  const displayMessages = paginatedMessages.reverse();
  
  // Use the oldest message's sentAt as the cursor for loading even older messages
  // The cursor should be the oldest message we're actually returning (not the extra one)
  const nextCursor = hasMore && paginatedMessages.length > 0 ? 
    paginatedMessages[0]?.sentAt.toISOString() : // paginatedMessages[0] is the oldest since we reversed
    null;

  // Get other participant info
  const otherParticipantId = conversation.participantIds.find(
    (id) => id !== userId
  );

  const otherParticipant = await db.user.findUnique({
    where: { id: otherParticipantId },
    select: {
      id: true,
      displayName: true,
      profilePhotoUrl: true,
    },
  });

  // Mark messages as read
  await db.message.updateMany({
    where: {
      conversationId: conversation.id,
      recipientId: userId,
      readAt: null,
    },
    data: {
      readAt: new Date(),
    },
  });

  return { 
    conversation, 
    messages: displayMessages,
    otherParticipant, 
    userId,
    hasMore,
    nextCursor,
  };
}

export async function action({ request, params }: Route.ActionArgs) {
  const userId = await requireUserId(request);
  const { conversationId } = params;

  const formData = await request.formData();
  const textContent = formData.get("textContent") as string;
  const postIdField = (formData.get('postId') as string) || null;

  // Get media URLs: support both client-provided `mediaUrl` strings and
  // raw uploaded files under the `media` field (MessageInput sends files as `media`).
  const mediaUrls: string[] = [];
  for (const [key, value] of formData.entries()) {
    // Pre-uploaded URL from client
    if (key === "mediaUrl" && typeof value === "string" && value.trim()) {
      mediaUrls.push(value.trim());
      continue;
    }

    // File upload from client - upload server-side to Cloudinary
    if (key === 'media' && typeof value === 'object' && value !== null) {
      try {
        // Some runtimes provide File/Blob with arrayBuffer and type
        const fileLike: any = value as any;
        const fileType: string | undefined = fileLike.type;
        const folder = fileType && fileType.startsWith('video/') ? 'posts/videos' : 'posts/images';

        // Upload via server helper which accepts a File-like object
        const uploaded = await uploadFileToCloudinary(fileLike as File, folder);
        if (uploaded && uploaded.secure_url) {
          mediaUrls.push(uploaded.secure_url);
        }
      } catch (err) {
        console.error('Error uploading message media to Cloudinary', err);
      }
    }
  }

  // If a postId was sent separately, convert it to the marker so the UI
  // and preview logic continue working. This also allows sending a post
  // share without any additional text.
  if ((!textContent || textContent.trim().length === 0) && postIdField) {
    // store marker as textContent
    const marker = `__POST_SHARE__:${postIdField}`;
    // set textContent variable used below
    // Note: we don't modify formData, just the local variable
    (textContent as any) = marker;
  }

  // Validate at least text, post share, or media
  if ((!textContent || textContent.trim().length === 0) && mediaUrls.length === 0) {
    return { error: "Message cannot be empty" };
  }

  if (textContent && textContent.length > 5000) {
    return { error: "Message is too long (max 5000 characters)" };
  }

  // Verify user is a participant
  const conversation = await db.conversation.findUnique({
    where: { id: conversationId },
    select: { participantIds: true },
  });

  if (!conversation || !conversation.participantIds.includes(userId)) {
    throw new Response("Unauthorized", { status: 403 });
  }

  // Find the other participant (recipient)
  const recipientId = conversation.participantIds.find((id) => id !== userId);

  if (!recipientId) {
    throw new Response("Invalid conversation", { status: 400 });
  }

  // Validate media count
  if (mediaUrls.length > 10) {
    return { error: "Maximum 10 media files allowed" };
  }

  // Create message
  const message = await db.message.create({
    data: {
      conversationId,
      senderId: userId,
      recipientId,
      textContent: textContent ? textContent.trim() : null,
      mediaUrls,
    },
    include: {
      sender: {
        select: {
          id: true,
          displayName: true,
          profilePhotoUrl: true,
        },
      },
    },
  });

  // Update conversation's lastMessageAt
  await db.conversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: new Date() },
  });

  // Emit Socket.IO event for real-time delivery
  emitToConversation(conversationId, 'message:new', {
    message: {
      id: message.id,
      conversationId: message.conversationId,
      sender: {
        id: message.sender.id,
        displayName: message.sender.displayName,
        profilePhotoUrl: message.sender.profilePhotoUrl,
      },
      textContent: message.textContent,
      mediaUrls: message.mediaUrls,
      sentAt: message.sentAt.toISOString(),
      readAt: message.readAt?.toISOString() || null,
    },
  });

  return { success: true };
}

export default function ConversationThread({ params }: Route.ComponentProps) {
  const { messages: initialMessages, otherParticipant, userId, hasMore: initialHasMore, nextCursor: initialNextCursor } = useLoaderData<typeof loader>();
  const [messages, setMessages] = useState(initialMessages);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const fetcher = useFetcher();

  // Join conversation room and get messaging utilities
  const { sendMessage, isTyping, startTyping, stopTyping } = useMessaging(params.conversationId);
  const { socket } = useSocket();

  // Load older messages when scrolling to top
  const handleLoadOlder = useCallback(async () => {
    if (!hasMore || isLoadingOlder) return;
    
    setIsLoadingOlder(true);
    if (nextCursor) {
      fetcher.load(`/messages/${params.conversationId}?cursor=${encodeURIComponent(nextCursor)}`);
    }
  }, [hasMore, isLoadingOlder, nextCursor, params.conversationId]);

  // Handle fetcher data for older messages
  useEffect(() => {
    if (fetcher.data?.messages && Array.isArray(fetcher.data.messages)) {
      setMessages(prev => {
        // Get existing message IDs to prevent duplicates
        const existingIds = new Set(prev.map(m => m.id));
        
        // Filter out any messages that are already loaded
        const newOlderMessages = fetcher.data.messages.filter(
          (message: any) => !existingIds.has(message.id)
        );
        
        // Only add if we have new messages
        if (newOlderMessages.length > 0) {
          return [
            ...newOlderMessages, // Older messages first
            ...prev // Current messages after
          ];
        }
        
        return prev;
      });
      
      setHasMore(fetcher.data.hasMore);
      setNextCursor(fetcher.data.nextCursor);
      setIsLoadingOlder(false);
    }
  }, [fetcher.data]);

  // Listen for new messages in real-time
  const handleNewMessage = useCallback((data: any) => {
    const newMessage = data.message;
    // Only add messages for this conversation
    if (newMessage.conversationId === params.conversationId) {
      setMessages((prev) => {
        // Check if message already exists by ID
        if (prev.some(m => m.id === newMessage.id)) {
          return prev;
        }
        
        // Check for optimistic message to replace
        // Find optimistic messages (temp IDs) that match the content and timing
        const optimisticIndex = prev.findIndex(m => {
          if (!m.id.startsWith('temp-')) return false;
          
          // Match by content and approximate timestamp (within 10 seconds)
          const contentMatch = m.textContent === newMessage.textContent && 
                              JSON.stringify(m.mediaUrls?.sort()) === JSON.stringify(newMessage.mediaUrls?.sort());
          
          const sentAtDiff = Math.abs(
            new Date(m.sentAt).getTime() - new Date(newMessage.sentAt).getTime()
          );
          const timeMatch = sentAtDiff < 10000; // 10 seconds tolerance
          
          return contentMatch && timeMatch;
        });
        
        if (optimisticIndex !== -1) {
          // Replace optimistic message with real one
          const updated = [...prev];
          updated[optimisticIndex] = newMessage;
          return updated;
        }
        
        // Add new message if no optimistic match found
        return [...prev, newMessage];
      });
    }
  }, [params.conversationId]);

  useMessageListener(handleNewMessage);

  // Reset messages and pagination when switching to a different conversation
  useEffect(() => {
    setMessages(initialMessages);
    setHasMore(initialHasMore);
    setNextCursor(initialNextCursor);
    setIsLoadingOlder(false);
  }, [initialMessages, initialHasMore, initialNextCursor, params.conversationId]);

  // Handle sending message
  const handleSendMessage = useCallback((textContent: string, mediaUrls: string[]) => {
    // Add optimistic message immediately
    const now = new Date();
    const optimisticMessage = {
      id: `temp-${now.getTime()}-${Math.random()}`,
      conversationId: params.conversationId,
      sender: {
        id: userId,
        displayName: "You",
        profilePhotoUrl: null,
      },
      senderId: userId,
      recipientId: otherParticipant?.id || '',
      textContent,
      mediaUrls: [...mediaUrls], // Ensure array is cloned
      sentAt: now,
      readAt: null,
    };
    
    setMessages(prev => [...prev, optimisticMessage]);
  }, [params.conversationId, userId]);

  return (
    <div className="flex h-screen flex-col bg-surface">
      {/* Header */}
      <div className="border-b border-default bg-surface px-4 py-4">
        <div className="mx-auto flex max-w-4xl items-center space-x-4">
          <Link
            to="/messages"
            className="text-secondary hover:text-primary"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Link>

          {otherParticipant && (
            <div className="flex items-center space-x-3">
              {otherParticipant.profilePhotoUrl ? (
                <img
                  src={otherParticipant.profilePhotoUrl}
                  alt={otherParticipant.displayName}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full text-white" style={{backgroundColor: 'var(--primary-color)'}}>
                  {otherParticipant.displayName[0].toUpperCase()}
                </div>
              )}
              <Link
                to={`/users/${otherParticipant.displayName}`}
                className="text-lg font-semibold text-primary hover:opacity-80"
              >
                {otherParticipant.displayName}
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Messages Thread */}
      <MessageThread 
        messages={messages} 
        currentUserId={userId} 
        onLoadOlder={handleLoadOlder} 
        hasMore={hasMore}
        isLoadingOlder={isLoadingOlder}
      />
      
      {isTyping && otherParticipant && (
        <div className="border-t border-default px-4 py-2 text-sm text-muted">
          {otherParticipant.displayName} is typing...
        </div>
      )}

      {/* Message Input */}
      <div className="border-t border-default bg-surface px-4 py-4">
        <div className="mx-auto max-w-4xl">
          <MessageInput 
            conversationId={params.conversationId}
            onSendMessage={handleSendMessage}
            onTypingStart={startTyping}
            onTypingStop={stopTyping}
          />
        </div>
      </div>
    </div>
  );
}
