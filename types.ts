export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  password?: string; // Only for mock DB usage
  blockedUsers?: string[]; // IDs of users blocked by this user
  isOnline?: boolean;
  publicKey?: string; // Base64 encoded RSA public key
  role?: 'user' | 'admin'; // Role for authorization
}

export interface Reaction {
  userId: string;
  type: 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry';
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  timestamp: Date;
  reactions?: Reaction[];
}

export interface Post {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  image?: string;
  feeling?: string;
  timestamp: Date;
  reactions: Reaction[];
  comments: Comment[];
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  image?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: string;
  timestamp: Date;
  isOwn: boolean;
  status: 'sent' | 'delivered' | 'read';
  expiresAt?: number; // For secret chats
  pqcData?: {
    kyberCipherText: string;
    aesCipherText: string;
    nonce: string;
  };
}

export interface Chat {
  id: string;
  partnerId: string; // ID of the other user, or group ID
  name: string;
  avatar: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  isBot?: boolean;
  isOnline?: boolean;
  lastSeen?: Date;
  isMuted?: boolean;
  relationshipStatus: 'friend' | 'pending_sent' | 'pending_received' | 'none' | 'blocked' | 'blocked_by_partner';
  
  // Telegram-like features
  type?: 'direct' | 'group' | 'channel' | 'saved';
  isSecret?: boolean;
  selfDestructTimer?: number; // in seconds
  pinnedMessageIds?: string[];
  adminIds?: string[];
  members?: string[];
  memberCount?: number;
}

export interface FriendRequest {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  receiverId: string;
  status: 'pending' | 'accepted' | 'rejected';
  timestamp: Date;
}

export interface AppNotification {
  id: string;
  userId: string;
  actorId: string;
  actorName: string;
  actorAvatar: string;
  type: 'comment' | 'reaction' | 'friend_request' | 'friend_accept';
  postId?: string;
  text?: string;
  isRead: boolean;
  timestamp: Date;
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  sendVerificationCode: (email: string) => Promise<boolean>;
  register: (email: string, password: string, name: string) => Promise<boolean>;
  logout: () => void;
  updateProfile: (name: string, avatar: string) => void;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
  isInitializing: boolean;
}