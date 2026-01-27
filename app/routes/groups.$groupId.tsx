import { db } from '~/lib/db.server';
import { requireUserId } from '~/lib/auth.server';
import { PageWrapper } from '~/components/ui/page-wrapper';
import { MessageThread } from '~/components/messages/message-thread';
import { MessageInput } from '~/components/messages/message-input';
import { emitToGroup } from '~/lib/realtime.server';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useGroupChat } from '~/hooks/use-socket';

export async function loader({ request, params }: any) {
  const userId = await requireUserId(request);
  const { groupId } = params;
  const group = await db.groupChat.findUnique({ where: { id: groupId } });
  if (!group) throw new Response('Group not found', { status: 404 });
  if (!group.participantIds.includes(userId)) throw new Response('Unauthorized', { status: 403 });
  // mark this user as having read up to now
  await db.groupChatParticipant.upsert({
    where: { groupChatId_participantId: { groupChatId: groupId, participantId: userId } } as any,
    create: { groupChatId: groupId, participantId: userId, lastReadAt: new Date() },
    update: { lastReadAt: new Date() },
  });

  const messages = await db.groupMessage.findMany({
    where: { groupChatId: groupId },
    orderBy: { sentAt: 'asc' },
    include: { sender: { select: { id: true, displayName: true, profilePhotoUrl: true } } },
    take: 1000,
  });

  // If the user opened the chat and the newest message wasn't sent by them,
  // mark that newest message as read by this user (deduplicating on DB side).
  try {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.senderId !== userId) {
      try {
        await db.$executeRaw`UPDATE "GroupMessage" SET "readBy" = (
          SELECT ARRAY(SELECT DISTINCT unnest("readBy" || ARRAY[${userId}::text]))
        ) WHERE "id" = ${lastMsg.id}`;
      } catch (sqlErr) {
        // Fallback: conservative update via Prisma API
        try {
          const current = await db.groupMessage.findUnique({ where: { id: lastMsg.id }, select: { readBy: true } });
          const currentArr = current?.readBy || [];
          if (!currentArr.includes(userId)) {
            await db.groupMessage.update({ where: { id: lastMsg.id }, data: { readBy: { push: userId } } as any });
          }
        } catch (fallbackErr) {
          console.error('Failed to mark last group message read on load:', fallbackErr);
        }
      }

      // Also update the in-memory messages so the loader returns the user as having read it.
      if (Array.isArray(messages) && messages.length > 0) {
        const idx = messages.length - 1;
        messages[idx] = { ...messages[idx], readBy: Array.from(new Set([...(messages[idx].readBy || []), userId])) } as any;
      }
    }
  } catch (err) {
    console.error('Error while attempting to mark newest group message as read in loader:', err);
  }

  // Load participant info
  const participants = await db.user.findMany({ where: { id: { in: group.participantIds } }, select: { id: true, displayName: true, profilePhotoUrl: true } });

  // Map message.readBy (ids) to user objects for the UI
  const participantMap = new Map(participants.map((p: any) => [p.id, p]));
  const annotatedMessages = messages.map((m: any) => {
    const readByIds: string[] = m.readBy || [];
    const readByUsers = readByIds.map(id => participantMap.get(id)).filter(Boolean);
    return { ...m, readBy: readByUsers };
  });

  return { group, messages: annotatedMessages, participants, userId };
}

export async function action({ request, params }: any) {
  const userId = await requireUserId(request);
  const { groupId } = params;
  const form = await request.formData();
  const textContent = form.get('textContent') as string | null;
  // media handling omitted for brevity; accept mediaUrls comma separated
  const media = (form.get('mediaUrls') as string | null) || '';
  const mediaUrls = media ? media.split(',').filter(Boolean) : [];

  // Verify membership
  const group = await db.groupChat.findUnique({ where: { id: groupId } });
  if (!group || !group.participantIds.includes(userId)) throw new Response('Unauthorized', { status: 403 });

  const message = await db.groupMessage.create({
    data: {
      groupChatId: groupId,
      senderId: userId,
      textContent: textContent || null,
      mediaUrls: mediaUrls,
    },
    include: { sender: { select: { id: true, displayName: true, profilePhotoUrl: true } } },
  });

  // Do not auto-mark the sender as having read their own message; readers are tracked when others view the message.

  // Update group's last message timestamp
  await db.groupChat.update({ where: { id: groupId }, data: { lastMessageAt: new Date() } });

  // Emit real-time event to group room
  emitToGroup(groupId, 'group:message:new', {
    message: {
      id: message.id,
      groupChatId: message.groupChatId,
      sender: message.sender,
      textContent: message.textContent,
      mediaUrls: message.mediaUrls,
      sentAt: message.sentAt.toISOString(),
    },
  });

  return { success: true };
}

export default function GroupThread({ loaderData }: any) {
  const { group, messages: initialMessages, participants, userId } = loaderData;
  const [messages, setMessages] = useState(initialMessages || []);

  // Join socket room for this group
  const socket = useGroupChat(group.id);

  // Ensure client-side navigation marks the group as read (SPA navigations)
  useEffect(() => {
    (async () => {
      try {
        await fetch(`/api/groups/${encodeURIComponent(group.id)}/read`, { method: 'POST' });
      } catch (e) {
        // ignore
      }
    })();
  }, [group.id]);

  // Track which message ids we've emitted a read for from this client.
  // We want to mark the newest message on initial load, and also mark
  // any incoming messages delivered while the user is actively in the chat.
  const emittedReadIdsRef = useRef(new Set<string>());
  useEffect(() => {
    if (!socket) return;
    const last = messages[messages.length - 1];
    if (!last) return;
    if (last.sender?.id === userId) return; // don't mark own messages as read
    if (emittedReadIdsRef.current.has(last.id)) return;
    socket.emit('group:message:read', { groupChatId: group.id, messageId: last.id });
    emittedReadIdsRef.current.add(last.id);
  }, [socket, group.id]);

  // Listen for incoming group messages
  useEffect(() => {
    if (!socket) return;

    const handler = (data: any) => {
      const incoming = data.message;
      // Prevent duplicates
      setMessages((prev: any[]) => {
        if (prev.some(m => m.id === incoming.id)) return prev;

        // Replace optimistic messages that match by content and recent timestamp
        const optimisticIndex = prev.findIndex(m => m.id?.startsWith?.('temp-') && m.textContent === incoming.textContent);
        if (optimisticIndex !== -1) {
          const copy = [...prev];
          copy[optimisticIndex] = incoming;
          return copy;
        }

        return [...prev, incoming];
      });
      // If the user is currently in the chat and the incoming message wasn't sent by them,
      // mark it as read from this client and optimistically update the UI.
      if (incoming && incoming.id && incoming.sender?.id !== userId && socket) {
        if (!emittedReadIdsRef.current.has(incoming.id)) {
          try {
            socket.emit('group:message:read', { groupChatId: group.id, messageId: incoming.id });
            emittedReadIdsRef.current.add(incoming.id);
          } catch (e) {
            // ignore emit failures
          }
        }
        // Optimistically add current user to readBy for this message in local state
        setMessages((prev: any[]) => prev.map(m => {
          if (m.id !== incoming.id) return m;
          const existing = m.readBy || [];
          if (existing.some((p: any) => p.id === userId)) return m;
          return { ...m, readBy: [...existing, { id: userId, displayName: 'You', profilePhotoUrl: null }] };
        }));
      }
    };

    socket.on('group:message:new', handler);
    const readHandler = (data: any) => {
      const { messageId, reader } = data;
      setMessages((prev: any[]) => prev.map(m => {
        if (m.id !== messageId) return m;
        const existing = m.readBy || [];
        if (existing.some((p: any) => p.id === reader.id)) return m;
        return { ...m, readBy: [...existing, reader] };
      }));
    };

    socket.on('group:message:read', readHandler);
    return () => {
      socket.off('group:message:new', handler);
      socket.off('group:message:read', readHandler);
    };
  }, [socket]);

  // Optimistic send handler used by MessageInput
  const handleOptimisticSend = useCallback((text: string, mediaUrls: string[]) => {
    const now = new Date();
    const temp = {
      id: `temp-${now.getTime()}-${Math.random()}`,
      groupChatId: group.id,
      sender: { id: userId, displayName: 'You', profilePhotoUrl: null },
      textContent: text,
      mediaUrls,
      sentAt: now.toISOString(),
    } as any;

    setMessages(prev => [...prev, temp]);
  }, [group.id, userId]);

  return (
    <div className="flex h-screen flex-col bg-surface">
      {/* Header */}
      <div className="border-b border-default bg-surface px-4 py-4">
        <div className="mx-auto flex max-w-4xl items-center space-x-4">
          <a href="/messages" className="text-secondary hover:text-primary">
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
          </a>

          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full text-white" style={{backgroundColor: 'var(--primary-color)'}}>
              {group.name[0].toUpperCase()}
            </div>
            <div>
              <div className="text-lg font-semibold text-primary">{group.name}</div>
              <div className="text-sm text-secondary">{participants.map((p: any) => p.displayName).join(', ')}</div>
            </div>
          </div>
          <div className="ml-auto">
            <a href={`/groups/${group.id}/settings`} className="rounded-md px-2 py-1 hover:bg-secondary text-secondary" title="Group settings">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7zm7.5-3.5a7.5 7.5 0 0 0-.15-1.5l2.04-1.58-2-3.46-2.4.96a7.5 7.5 0 0 0-1.3-.75L15 1h-6l-.54 2.17c-.46.18-.9.4-1.3.66L4.76 2.87 2.78 6.33 4.82 7.9c-.1.5-.16 1-.16 1.6s.06 1.1.16 1.6L2.78 13.7l1.98 3.46 2.4-.96c.4.26.84.48 1.3.66L9 23h6l.54-2.17c.46-.18.9-.4 1.3-.66l2.4.96 1.98-3.46-2.04-1.58c.1-.5.16-1 .16-1.6z" />
              </svg>
            </a>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-4xl py-6">
          <MessageThread messages={messages} currentUserId={userId} onLoadOlder={() => {}} hasMore={false} isLoadingOlder={false} />
        </div>
      </div>

      <div className="border-t border-default bg-surface px-4 py-4">
        <div className="mx-auto max-w-4xl">
          <MessageInput conversationId={group.id} onSendMessage={handleOptimisticSend} onTypingStart={() => {}} onTypingStop={() => {}} />
        </div>
      </div>
    </div>
  );
}
