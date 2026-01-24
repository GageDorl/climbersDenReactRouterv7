import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { 
  ServerToClientEvents, 
  ClientToServerEvents,
  MessageSendPayload,
  MessageReadPayload,
  TypingStartPayload,
  TypingStopPayload,
} from '~/types/realtime';

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
let isSocketConnected = false;
const connectionListeners: Set<(connected: boolean) => void> = new Set();

function notifyConnectionChange(connected: boolean) {
  isSocketConnected = connected;
  connectionListeners.forEach(listener => listener(connected));
}

export function useSocket(shouldConnect = true) {
  const [isConnected, setIsConnected] = useState(isSocketConnected);

  useEffect(() => {
    // Register this component's state updater
    connectionListeners.add(setIsConnected);
    
    if (!socket) {
      socket = io({
        autoConnect: false,
        withCredentials: true,
      });

      socket.on('connect', () => {
        console.log('Socket.IO connected');
        notifyConnectionChange(true);
      });

      socket.on('disconnect', () => {
        console.log('Socket.IO disconnected');
        notifyConnectionChange(false);
      });

      socket.on('connect_error', (error) => {
        console.error('Socket.IO connection error:', error);
        notifyConnectionChange(false);
      });
    }

    // Connect socket if not already connected and shouldConnect is true
    if (shouldConnect && !socket.connected) {
      socket.connect();
    } else if (!shouldConnect && socket.connected) {
      // Disconnect if we shouldn't connect
      socket.disconnect();
    } else if (shouldConnect && socket.connected) {
      // Already connected, update state
      setIsConnected(true);
    }

    return () => {
      // Unregister this component's state updater
      connectionListeners.delete(setIsConnected);
    };
  }, [shouldConnect]);

  return {
    socket,
    isConnected,
  };
}

// Messaging hooks
export function useMessaging(conversationId: string) {
  const { socket, isConnected } = useSocket();
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (!socket || !conversationId) return;

    // Join conversation room
    socket.emit('conversation:join', conversationId);

    // Listen for typing events
    const handleTypingStart = () => setIsTyping(true);
    const handleTypingStop = () => setIsTyping(false);

    socket.on('typing:start', handleTypingStart);
    socket.on('typing:stop', handleTypingStop);

    return () => {
      socket.emit('conversation:leave', conversationId);
      socket.off('typing:start', handleTypingStart);
      socket.off('typing:stop', handleTypingStop);
    };
  }, [socket, conversationId]);

  const sendMessage = useCallback((payload: MessageSendPayload) => {
    if (socket && isConnected) {
      socket.emit('message:send', payload);
    }
  }, [socket, isConnected]);

  const markAsRead = useCallback((messageId: string) => {
    if (socket && isConnected) {
      socket.emit('message:read', { messageId });
    }
  }, [socket, isConnected]);

  const startTyping = useCallback(() => {
    if (socket && isConnected && conversationId) {
      socket.emit('typing:start', { conversationId });
    }
  }, [socket, isConnected, conversationId]);

  const stopTyping = useCallback(() => {
    if (socket && isConnected && conversationId) {
      socket.emit('typing:stop', { conversationId });
    }
  }, [socket, isConnected, conversationId]);

  return {
    sendMessage,
    markAsRead,
    startTyping,
    stopTyping,
    isTyping,
    isConnected,
  };
}

// Listen for new messages
export function useMessageListener(callback: (message: any) => void) {
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    const handler = (data: any) => {
      callback(data);
    };

    socket.on('message:new', handler);

    return () => {
      socket.off('message:new', handler);
    };
  }, [socket, callback]);
}

// Conversation hooks (legacy - keeping for compatibility)
export function useConversation(conversationId: string | null) {
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket || !conversationId) return;

    socket.emit('conversation:join', conversationId);

    return () => {
      socket.emit('conversation:leave', conversationId);
    };
  }, [socket, conversationId]);

  return socket;
}

// Group chat hooks
export function useGroupChat(groupChatId: string | null) {
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket || !groupChatId) return;

    socket.emit('group:join', groupChatId);

    return () => {
      socket.emit('group:leave', groupChatId);
    };
  }, [socket, groupChatId]);

  return socket;
}

// Gear list hooks
export function useGearList(gearListId: string | null) {
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket || !gearListId) return;

    socket.emit('gear:join', gearListId);

    return () => {
      socket.emit('gear:leave', gearListId);
    };
  }, [socket, gearListId]);

  return socket;
}

// Typing indicator hook
export function useTypingIndicator(conversationId: string | null) {
  const { socket } = useSocket();

  const sendTypingStart = () => {
    if (socket && conversationId) {
      socket.emit('typing:start', { conversationId });
    }
  };

  const sendTypingStop = () => {
    if (socket && conversationId) {
      socket.emit('typing:stop', { conversationId });
    }
  };

  return {
    sendTypingStart,
    sendTypingStop,
  };
}

export { socket };
