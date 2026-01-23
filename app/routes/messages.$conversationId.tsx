import { Form, Link, useLoaderData, useFetcher } from "react-router";
import { useState, useEffect, useCallback, useRef } from "react";
import type { Route } from "./+types/messages.$conversationId";
import { requireUserId } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { uploadFileToCloudinary } from "~/lib/cloudinary.server";
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
  const MESSAGES_PER_PAGE = 30;

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

  // Fetch messages with cursor-based pagination
  const messages = await db.message.findMany({
    where: { conversationId },
    orderBy: { sentAt: 'asc' },
    take: MESSAGES_PER_PAGE + 1, // Take one extra to check if there are more
    skip: cursor ? 1 : 0,
    cursor: cursor ? { id: cursor } : undefined,
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
  const paginatedMessages = messages.slice(0, MESSAGES_PER_PAGE);

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
    messages: paginatedMessages,
    otherParticipant, 
    userId,
    hasMore,
    nextCursor: hasMore ? paginatedMessages[paginatedMessages.length - 1].id : null,
  };
}

export async function action({ request, params }: Route.ActionArgs) {
  const userId = await requireUserId(request);
  const { conversationId } = params;

  const formData = await request.formData();
  const textContent = formData.get("textContent") as string;
  const mediaFiles = formData.getAll("media") as File[];

  // Validate at least text or media
  if ((!textContent || textContent.trim().length === 0) && mediaFiles.length === 0) {
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

  // Upload media files to Cloudinary
  let mediaUrls: string[] = [];
  if (mediaFiles.length > 0) {
    const validFiles = mediaFiles.filter((file) => file.size > 0);
    
    if (validFiles.length > 10) {
      return { error: "Maximum 10 media files allowed" };
    }

    try {
      const uploadPromises = validFiles.map((file) =>
        uploadFileToCloudinary(file, "messages")
      );
      const uploadResults = await Promise.all(uploadPromises);
      mediaUrls = uploadResults.map((result) => result.secure_url);
    } catch (error) {
      console.error("Media upload failed:", error);
      return { error: "Failed to upload media files" };
    }
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
  const { messages: initialMessages, otherParticipant, userId, hasMore } = useLoaderData<typeof loader>();
  const [messages, setMessages] = useState(initialMessages);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const fetcher = useFetcher();

  // Join conversation room and get messaging utilities
  const { sendMessage, isTyping, startTyping, stopTyping } = useMessaging(params.conversationId);
  const { socket } = useSocket();

  // Load older messages when scrolling to top
  const handleLoadOlder = useCallback(async () => {
    if (!hasMore || isLoadingOlder) return;
    
    setIsLoadingOlder(true);
    const firstMessageId = messages[0]?.id;
    if (firstMessageId) {
      fetcher.load(`/messages/${params.conversationId}?cursor=${firstMessageId}`);
    }
  }, [hasMore, isLoadingOlder, messages, params.conversationId]);

  // Handle fetcher data for older messages
  useEffect(() => {
    if (fetcher.data?.messages && Array.isArray(fetcher.data.messages)) {
      setMessages(prev => [
        ...fetcher.data.messages,
        ...prev
      ]);
      setIsLoadingOlder(false);
    }
  }, [fetcher.data]);

  // Listen for new messages in real-time
  const handleNewMessage = useCallback((data: any) => {
    const newMessage = data.message;
    // Only add messages for this conversation
    if (newMessage.conversationId === params.conversationId) {
      setMessages((prev) => {
        // Check if message already exists
        if (prev.some(m => m.id === newMessage.id)) {
          return prev;
        }
        return [...prev, newMessage];
      });
    }
  }, [params.conversationId]);

  useMessageListener(handleNewMessage);

  // Only reset messages when switching to a different conversation
  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  // Handle sending message
  const handleSendMessage = useCallback((textContent: string, mediaUrls: string[]) => {
    // Add optimistic message immediately
    const optimisticMessage = {
      id: `temp-${Date.now()}-${Math.random()}`,
      conversationId: params.conversationId,
      sender: {
        id: userId,
        displayName: "You",
        profilePhotoUrl: null,
      },
      textContent,
      mediaUrls,
      sentAt: new Date().toISOString(),
      readAt: null,
    };
    
    setMessages(prev => [...prev, optimisticMessage]);
  }, [params.conversationId, userId]);

  return (
    <div className="flex h-screen flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-4 py-4 dark:border-gray-800 dark:bg-gray-950">
        <div className="mx-auto flex max-w-4xl items-center space-x-4">
          <Link
            to="/messages"
            className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
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
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white">
                  {otherParticipant.displayName[0].toUpperCase()}
                </div>
              )}
              <Link
                to={`/users/${otherParticipant.displayName}`}
                className="text-lg font-semibold text-gray-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
              >
                {otherParticipant.displayName}
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Messages Thread */}
      <MessageThread messages={messages} currentUserId={userId} onLoadOlder={handleLoadOlder} hasMore={hasMore} />
      
      {isTyping && otherParticipant && (
        <div className="border-t border-gray-200 px-4 py-2 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
          {otherParticipant.displayName} is typing...
        </div>
      )}

      {/* Message Input */}
      <div className="border-t border-gray-200 bg-white px-4 py-4 dark:border-gray-800 dark:bg-gray-950">
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
