// Socket.IO event types for real-time communication
// Based on contracts/realtime.md

// User info included in real-time events
export interface SocketUser {
  id: string;
  displayName: string;
  profilePhotoUrl: string | null;
}

// Message object in real-time events
export interface SocketMessage {
  id: string;
  conversationId: string;
  sender: SocketUser;
  textContent: string | null;
  mediaUrls: string[];
  sentAt: string;
  readAt: string | null;
}

// Messaging Events - Client → Server
export interface MessageSendPayload {
  conversationId: string;
  textContent?: string;
  mediaUrls: string[];
  tempId: string; // Client-generated temporary ID for optimistic UI
}

export interface MessageReadPayload {
  messageId: string;
}

export interface TypingStartPayload {
  conversationId: string;
}

export interface TypingStopPayload {
  conversationId: string;
}

// Messaging Events - Server → Client
export interface MessageNewPayload {
  message: SocketMessage;
}

export interface MessageSentPayload {
  tempId: string;
  message: SocketMessage;
}

export interface MessageReadEvent {
  messageId: string;
  conversationId: string;
  readAt: string;
  readBy: SocketUser;
}

export interface TypingEvent {
  conversationId: string;
  user: SocketUser;
}

// Notification Events
export interface NotificationPayload {
  notification: {
    id: string;
    type: 'new_message' | 'post_liked' | 'new_follower' | 'gear_claimed' | 'all_gear_claimed' | 'post_comment' | 'comment_reply';
    entityId: string;
    message: string;
    createdAt: string;
    read: boolean;
  };
}

// Gear List Events - Client → Server
export interface GearClaimPayload {
  gearListId: string;
  gearItemId: string;
  quantity: number;
}

export interface GearUnclaimPayload {
  gearListId: string;
  gearItemId: string;
  quantity: number;
}

// Comment Events - Server → Client
export interface CommentPayload {
  id: string;
  postId: string;
  userId: string;
  textContent: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  parentCommentId: string | null;
  user: SocketUser;
  replies: CommentPayload[];
}

export interface CommentNewPayload {
  postId: string;
  comment: CommentPayload;
}

export interface CommentEditedPayload {
  postId: string;
  comment: CommentPayload;
}

export interface CommentDeletedPayload {
  postId: string;
  commentId: string;
}

// Comment Events - Client → Server
export interface CommentRoomJoinPayload {
  postId: string;
}

export interface CommentRoomLeavePayload {
  postId: string;
}

// Gear List Events - Server → Client
export interface GearUpdatedPayload {
  gearListId: string;
  gearItem: {
    id: string;
    itemName: string;
    quantityNeeded: number;
    quantityClaimed: number;
    claimedByUserIds: string[];
    notes: string | null;
  };
  updatedBy: SocketUser;
}

export interface GearAllClaimedPayload {
  gearListId: string;
  gearItemId: string;
}

export interface GearClaimedPayload {
  gearListId: string;
  itemId: string;
  itemName: string;
  quantityNeeded: number;
  quantityClaimed: number;
  claimedByUsers: Array<{ id: string; displayName: string; profilePhotoUrl: string | null; quantity: number }>;
  userId: string;
}

export interface GearUnclaimedPayload extends GearClaimedPayload {}

// Post Like Events
export interface PostLikePayload {
  postId: string;
  userId: string;
  liked: boolean;
  likeCount: number;
}

// Presence Events (P3 - Future)
export interface UserOnlinePayload {
  userId: string;
}

export interface UserOfflinePayload {
  userId: string;
  lastSeen: string;
}

// Group Chat Events (P3 - Future)
export interface GroupMessagePayload {
  groupChatId: string;
  message: {
    id: string;
    sender: SocketUser;
    textContent: string | null;
    mediaUrls: string[];
    sentAt: string;
  };
}

// Socket.IO event map for type safety
export interface ServerToClientEvents {
  'message:new': (payload: MessageNewPayload) => void;
  'message:sent': (payload: MessageSentPayload) => void;
  'message:read': (payload: MessageReadEvent) => void;
  'typing:start': (payload: TypingEvent) => void;
  'typing:stop': (payload: TypingEvent) => void;
  'notification:new': (payload: NotificationPayload) => void;
  'gear:updated': (payload: GearUpdatedPayload) => void;
  'gear:all-claimed': (payload: GearAllClaimedPayload) => void;
  'gear:claimed': (payload: GearClaimedPayload) => void;
  'gear:unclaimed': (payload: GearUnclaimedPayload) => void;
  'user:online': (payload: UserOnlinePayload) => void;
  'user:offline': (payload: UserOfflinePayload) => void;
  'group-message:new': (payload: GroupMessagePayload) => void;
  'comment:new': (payload: CommentNewPayload) => void;
  'comment:edited': (payload: CommentEditedPayload) => void;
  'comment:deleted': (payload: CommentDeletedPayload) => void;
  'post:like': (payload: PostLikePayload) => void;
}

export interface ClientToServerEvents {
  'message:send': (payload: MessageSendPayload) => void;
  'message:read': (payload: MessageReadPayload) => void;
  'typing:start': (payload: TypingStartPayload) => void;
  'typing:stop': (payload: TypingStopPayload) => void;
  'conversation:join': (conversationId: string) => void;
  'conversation:leave': (conversationId: string) => void;
  'group:join': (groupChatId: string) => void;
  'group:leave': (groupChatId: string) => void;
  'gear:join': (gearListId: string) => void;
  'gear:leave': (gearListId: string) => void;
  'gear:claim': (payload: GearClaimPayload) => void;
  'gear:unclaim': (payload: GearUnclaimPayload) => void;
  'post:join': (payload: CommentRoomJoinPayload) => void;
  'post:leave': (payload: CommentRoomLeavePayload) => void;
}
