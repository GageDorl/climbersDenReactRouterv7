import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { getUserId } from './auth.server';
import type { 
  ServerToClientEvents, 
  ClientToServerEvents,
  MessageSendPayload,
  MessageReadPayload,
  TypingStartPayload,
  TypingStopPayload,
} from '~/types/realtime';
import { db } from './db.server';

// Use globalThis to ensure same instance across module boundaries
declare global {
  var __socketIO: SocketIOServer<ClientToServerEvents, ServerToClientEvents> | null;
}

globalThis.__socketIO = globalThis.__socketIO || null;

// Message delivery queue for offline users
const messageQueue = new Map<string, Array<any>>();

export function initializeSocketIO(server: HTTPServer) {
  console.log('[Socket.IO] initializeSocketIO called');
  if (globalThis.__socketIO) {
    console.log('[Socket.IO] globalThis.__socketIO already initialized');
    return globalThis.__socketIO;
  }

  console.log('[Socket.IO] Creating new Socket.IO instance');
  const io = new SocketIOServer(server, {
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? process.env.APP_URL 
        : 'http://localhost:5173',
      credentials: true,
    },
  });

  // Set global reference
  globalThis.__socketIO = io;
  console.log('[Socket.IO] globalThis.__socketIO set, io exists:', !!io);

  io.use(async (socket, next) => {
    try {
      // Get session cookie from handshake
      const cookies = socket.handshake.headers.cookie;
      if (!cookies) {
        return next(new Error('Authentication required'));
      }

      // Create a mock request object to use with getUserId
      const mockRequest = {
        headers: {
          get: (name: string) => name === 'Cookie' ? cookies : null,
        },
      } as any;

      const userId = await getUserId(mockRequest);
      if (!userId) {
        return next(new Error('Authentication required'));
      }

      // Attach userId to socket
      (socket as any).userId = userId;
      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId;

    // Join user's personal room for notifications
    socket.join(`user:${userId}`);

    // Deliver queued messages for this user on connect
    if (messageQueue.has(userId)) {
      const queuedMessages = messageQueue.get(userId) || [];
      queuedMessages.forEach((message) => {
        socket.emit('message:new', { message });
      });
      messageQueue.delete(userId);
    }

    // Handle disconnection
    socket.on('disconnect', () => {
      // Clean up on disconnect
    });

    // Messaging events
    socket.on('message:send', async (data: MessageSendPayload) => {
      try {
        // Get conversation to find the recipient
        const conversation = await db.conversation.findUnique({
          where: { id: data.conversationId },
          select: { participantIds: true },
        });

        if (!conversation) return;

        // Find the other participant (recipient)
        const recipientId = conversation.participantIds.find((id) => id !== userId);

        if (!recipientId) return;

        // Create message in database
        const message = await db.message.create({
          data: {
            conversationId: data.conversationId,
            senderId: userId,
            recipientId,
            textContent: data.textContent || null,
            mediaUrls: data.mediaUrls,
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
          where: { id: data.conversationId },
          data: { lastMessageAt: new Date() },
        });

        // Emit confirmation to sender
        socket.emit('message:sent', {
          tempId: data.tempId,
          message: {
            id: message.id,
            conversationId: message.conversationId,
            sender: message.sender,
            textContent: message.textContent,
            mediaUrls: message.mediaUrls,
            sentAt: message.sentAt.toISOString(),
            readAt: null,
          },
        });

        const messagePayload = {
          id: message.id,
          conversationId: message.conversationId,
          sender: message.sender,
          textContent: message.textContent,
          mediaUrls: message.mediaUrls,
          sentAt: message.sentAt.toISOString(),
          readAt: null,
        };

        // Try to emit to recipient; queue if offline
        const recipientSocket = globalThis.__socketIO?.sockets.sockets.get(`user:${recipientId}`);
        if (recipientSocket) {
          socket.to(`conversation:${data.conversationId}`).emit('message:new', {
            message: messagePayload,
            tempId: data.tempId,
          });
        } else {
          // Queue message for offline user
          if (!messageQueue.has(recipientId)) {
            messageQueue.set(recipientId, []);
          }
          messageQueue.get(recipientId)!.push(messagePayload);
        }

        // Create notification for recipient (using recipientId from above)
        const notification = await db.notification.create({
          data: {
            userId: recipientId,
            type: 'new_message',
            relatedEntityId: message.id,
            relatedEntityType: 'message',
            content: {
              message: `${message.sender.displayName} sent you a message`,
              senderName: message.sender.displayName,
            },
            readStatus: false,
          },
        });

        // Emit notification to recipient
        socket.to(`user:${recipientId}`).emit('notification:new', {
          notification: {
            id: notification.id,
            type: notification.type,
            entityId: notification.relatedEntityId || '',
            message: (notification.content as any).message,
            createdAt: notification.createdAt.toISOString(),
            read: notification.readStatus,
          },
        });
      } catch (error) {
        console.error('Error sending message:', error);
      }
    });

    socket.on('message:read', async (data: MessageReadPayload) => {
      try {
        // Find message and ensure we don't mark the sender as the reader
        const msg = await db.message.findUnique({ where: { id: data.messageId }, select: { id: true, senderId: true, conversationId: true, readAt: true } });
        if (!msg) return;
        if (msg.senderId === userId) return; // don't count sender as reader

        // Only set readAt if it's currently null
        let updatedReadAt = msg.readAt;
        if (!msg.readAt) {
          await db.message.update({ where: { id: data.messageId }, data: { readAt: new Date() } });
          updatedReadAt = new Date();
        }

        // Look up reader details
        const reader = await db.user.findUnique({ where: { id: userId }, select: { id: true, displayName: true, profilePhotoUrl: true } });

        // Emit read receipt to the conversation room (so both participants receive it)
        socket.to(`conversation:${msg.conversationId}`).emit('message:read', {
          messageId: msg.id,
          conversationId: msg.conversationId,
          readAt: updatedReadAt ? updatedReadAt.toISOString() : null,
          reader,
        });

        // Also notify the sender's personal room for direct notifications
        socket.to(`user:${msg.senderId}`).emit('message:read', {
          messageId: msg.id,
          conversationId: msg.conversationId,
          readAt: updatedReadAt ? updatedReadAt.toISOString() : null,
          reader,
        });
      } catch (error) {
        console.error('Error marking message as read:', error);
      }
    });

    socket.on('typing:start', (data: TypingStartPayload) => {
      socket.to(`conversation:${data.conversationId}`).emit('typing:start', {
        conversationId: data.conversationId,
        user: {
          id: userId,
          displayName: '', // Filled by client
          profilePhotoUrl: null,
        },
      });
    });

    socket.on('typing:stop', (data: TypingStopPayload) => {
      socket.to(`conversation:${data.conversationId}`).emit('typing:stop', {
        conversationId: data.conversationId,
        user: {
          id: userId,
          displayName: '', // Filled by client
          profilePhotoUrl: null,
        },
      });
    });

    socket.on('conversation:join', (conversationId: string) => {
      socket.join(`conversation:${conversationId}`);
    });

    socket.on('conversation:leave', (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`);
    });

    // Group chat events
    socket.on('group:join', (groupChatId: string) => {
      socket.join(`group:${groupChatId}`);
    });

    socket.on('group:leave', (groupChatId: string) => {
      socket.leave(`group:${groupChatId}`);
    });

    socket.on('group:message', async (data: { groupChatId: string; messageId: string }) => {
      socket.to(`group:${data.groupChatId}`).emit('group:message:new', data);
    });

    socket.on('group:message:read', async (data: { groupChatId: string; messageId: string }) => {
      try {
        const { groupChatId, messageId } = data;

        // Upsert participant lastReadAt
        await db.groupChatParticipant.upsert({
          where: { groupChatId_participantId: { groupChatId, participantId: userId } } as any,
          create: { groupChatId, participantId: userId, lastReadAt: new Date() },
          update: { lastReadAt: new Date() },
        });


        // Ensure message exists and check sender
        const msg = await db.groupMessage.findUnique({ where: { id: messageId }, select: { id: true, senderId: true } });
        if (!msg) return;
        // Don't count a user as reading their own message
        if (msg.senderId === userId) return;

        // Use a deduplicating SQL update to append the reader to the array
        // This avoids race conditions where multiple concurrent events could add duplicates.
        try {
          await db.$executeRaw`UPDATE "GroupMessage" SET "readBy" = (
            SELECT ARRAY(SELECT DISTINCT unnest("readBy" || ARRAY[${userId}::text]))
          ) WHERE "id" = ${messageId}`;
        } catch (sqlErr) {
          // Fallback: try a conservative update via Prisma API (best-effort)
          try {
            const current = await db.groupMessage.findUnique({ where: { id: messageId }, select: { readBy: true } });
            const currentArr = current?.readBy || [];
            if (!currentArr.includes(userId)) {
              await db.groupMessage.update({ where: { id: messageId }, data: { readBy: { push: userId } } as any });
            }
          } catch (fallbackErr) {
            console.error('Failed to update groupMessage.readBy (both SQL and fallback):', fallbackErr);
          }
        }

        // Get reader info
        const reader = await db.user.findUnique({ where: { id: userId }, select: { id: true, displayName: true, profilePhotoUrl: true } });

        // Emit read event to the group so clients can update read indicators
        socket.to(`group:${groupChatId}`).emit('group:message:read', {
          messageId,
          groupChatId,
          reader,
        });
      } catch (err) {
        console.error('Error handling group message read:', err);
      }
    });

    // Comment events
    socket.on('post:join', (data: { postId: string }) => {
      console.log(`[Socket.IO] Socket ${socket.id} joining post:${data.postId}`);
      socket.join(`post:${data.postId}`);
      console.log(`[Socket.IO] Socket ${socket.id} joined. Rooms:`, Array.from(socket.rooms));
    });

    socket.on('post:leave', (data: { postId: string }) => {
      console.log(`[Socket.IO] Socket ${socket.id} leaving post:${data.postId}`);
      socket.leave(`post:${data.postId}`);
    });

    // Gear list events
    socket.on('gear:join', (gearListId: string) => {
      socket.join(`gear:${gearListId}`);
    });

    socket.on('gear:leave', (gearListId: string) => {
      socket.leave(`gear:${gearListId}`);
    });

    socket.on('gear:claim', async (data: { gearListId: string; itemId: string }) => {
      socket.to(`gear:${data.gearListId}`).emit('gear:claimed', data);
    });

    socket.on('gear:unclaim', async (data: { gearListId: string; itemId: string }) => {
      socket.to(`gear:${data.gearListId}`).emit('gear:unclaimed', data);
    });
  });

  return io;
}

// Helper functions to emit events from server-side code
export function emitToUser(userId: string, event: keyof ServerToClientEvents, data: any) {
  if (!globalThis.__socketIO) return;
  globalThis.__socketIO.to(`user:${userId}`).emit(event, data);
}

export function emitToConversation(conversationId: string, event: keyof ServerToClientEvents, data: any) {
  if (!globalThis.__socketIO) return;
  globalThis.__socketIO.to(`conversation:${conversationId}`).emit(event, data);
}

export function emitToGroup(groupChatId: string, event: keyof ServerToClientEvents, data: any) {
  if (!globalThis.__socketIO) return;
  globalThis.__socketIO.to(`group:${groupChatId}`).emit(event, data);
}

export function emitToGearList(gearListId: string, event: keyof ServerToClientEvents, data: any) {
  if (!globalThis.__socketIO) return;
  globalThis.__socketIO.to(`gear:${gearListId}`).emit(event, data);
}

// Get the socket.io instance
export function getSocketIO() {
  console.log('[getSocketIO] globalThis.__socketIO:', !!globalThis.__socketIO);
  return globalThis.__socketIO;
}

export const realtime = {
  get io() {
    return globalThis.__socketIO;
  }
};
