// Export Prisma generated types
export type {
  User,
  Post,
  Like,
  Conversation,
  Message,
  Follow,
  Notification,
  Report,
  Block,
  GroupChat,
  GroupMessage,
  Crag,
  Route,
  Tick,
  RouteRating,
  FavoriteCrag,
  WeatherForecast,
  Journal,
  GearList,
  GearItem,
  CragSubmission,
  ExperienceLevel,
  NotificationType,
  EntityType,
  ReportEntityType,
  ReportStatus,
  RouteType,
  SendStyle,
  ClimbingSuitability,
  SyncStatus,
  SubmissionEntityType,
  SubmissionStatus,
} from '@prisma/client';

// Import Comment type separately
import type { Comment } from '@prisma/client';
export type { Comment };

// Custom types for loaders and actions
export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  bio: string | null;
  profilePhotoUrl: string | null;
  locationCity: string | null;
  climbingStyles: string[];
  experienceLevel: string;
  followerCount?: number;
  followingCount?: number;
  isFollowing?: boolean;
}

export interface MessageWithSender {
  id: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  textContent: string | null;
  mediaUrls: string[];
  sentAt: Date;
  readAt: Date | null;
  sender: {
    id: string;
    displayName: string;
    profilePhotoUrl: string | null;
  };
}

export interface ConversationWithDetails {
  id: string;
  participantIds: string[];
  lastMessageAt: Date;
  createdAt: Date;
  otherParticipant: {
    id: string;
    displayName: string;
    profilePhotoUrl: string | null;
  } | null;
  lastMessage: MessageWithSender | null;
  unreadCount: number;
}

export interface PostWithUser {
  id: string;
  userId: string;
  textContent: string | null;
  mediaUrls: string[];
  likeCount: number;
  createdAt: Date;
  user: {
    id: string;
    displayName: string;
    profilePhotoUrl: string | null;
  };
  isLikedByCurrentUser?: boolean;
}

export interface ConversationWithUser {
  id: string;
  participantIds: string[];
  lastMessageAt: Date;
  otherUser: {
    id: string;
    displayName: string;
    profilePhotoUrl: string | null;
  };
  lastMessage?: {
    textContent: string | null;
    sentAt: Date;
  };
  unreadCount: number;
}

export interface MessageWithSender {
  id: string;
  conversationId: string;
  senderId: string;
  textContent: string | null;
  mediaUrls: string[];
  sentAt: Date;
  readAt: Date | null;
  sender: {
    id: string;
    displayName: string;
    profilePhotoUrl: string | null;
  };
}

export interface CragWithDistance {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  description: string | null;
  elevation: number | null;
  totalRouteCount: number;
  distance?: number; // Distance from user in miles
  isFavorite?: boolean;
}

export interface RouteWithCrag {
  id: string;
  name: string;
  type: string;
  grade: string;
  pitchCount: number;
  length: number | null;
  description: string | null;
  averageRating: number | null;
  ratingCount: number;
  crag: {
    id: string;
    name: string;
  };
  userRating?: number;
  hasTicked?: boolean;
}

export interface TickWithRoute {
  id: string;
  date: Date;
  sendStyle: string;
  attempts: number | null;
  personalNotes: string | null;
  route: {
    id: string;
    name: string;
    type: string;
    grade: string;
    crag: {
      id: string;
      name: string;
    };
  };
}
