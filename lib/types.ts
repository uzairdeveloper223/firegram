// Core Firegram Types
export interface FiregramUser {
  uid: string
  username: string
  fullName: string
  email: string
  profilePicture?: string
  bio?: string
  isVerified?: boolean
  isAdvancedUser?: boolean
  createdAt: number
  lastActive?: number
  
  // Admin/moderation
  isBanned?: boolean
  banId?: string
  
  // Privacy settings
  isPrivate?: boolean
  hideOnlineStatus?: boolean
  allowMessages?: 'everyone' | 'followers' | 'none'
  
  // Counts
  followersCount?: number
  followingCount?: number
  postsCount?: number
  
  // Video usage tracking
  videoUsage?: {
    totalDuration: number // in seconds
    monthlyUsage?: {
      [monthYear: string]: number // monthYear format: "2023-08", value: duration in seconds
    }
  }
  
  // MysteryMart integration
  mysteryMartLinked?: boolean
  mysteryMartData?: any
}

export interface FiregramPost {
  id: string
  authorId: string
  content: string
  images: string[]
  videos?: string[] // Add support for videos
  createdAt: number
  updatedAt?: number
  
  // Privacy and engagement
  privacy: 'public' | 'followers' | 'private'
  isPinned?: boolean
  isEdited?: boolean
  
  // Engagement
  likesCount?: number
  commentsCount?: number
  sharesCount?: number
  
  // Advanced features
  isFeatured?: boolean // For Advanced Users
  scheduledFor?: number
  
  // Mentions
  mentions?: string[]
}

export interface FiregramMessage {
  id: string
  chatId: string
  senderId: string
  content: string
  type: 'text' | 'image' | 'video' | 'file' | 'post_share'
  createdAt: number
  updatedAt?: number
  
  // Message features
  isEdited?: boolean
  isDeleted?: boolean
  replyTo?: string
  isForwarded?: boolean
  
  // Media
  mediaUrl?: string
  mediaType?: string
  duration?: number
  
  // Post sharing
  sharedPostId?: string
}

export interface FiregramChat {
  id: string
  type: 'private' | 'group'
  participants: string[]
  createdAt: number
  lastMessageAt?: number
  
  // Group features
  name?: string
  description?: string
  adminIds?: string[]
  isAdvancedOnly?: boolean
  
  // Advanced group settings
  bannedWords?: string[]
  kickBehavior?: 'kick' | 'temp_kick'
  tempKickDuration?: number // in hours
  inviteLink?: string
  postsDisabled?: boolean
  
  // Member visibility (for anonymous mode)
  hiddenMembers?: string[]
  
  // Settings
  isMuted?: boolean
  muteUntil?: number
}

export interface FiregramNotification {
  id: string
  userId: string
  type: 'like' | 'comment' | 'follow' | 'mention' | 'message' | 'admin'
  fromUserId: string
  postId?: string
  messageId?: string
  chatId?: string
  content?: string
  createdAt: number
  isRead?: boolean
}

export interface FiregramComment {
  id: string
  postId: string
  authorId: string
  content: string
  createdAt: number
  updatedAt?: number
  isEdited?: boolean
  isDeleted?: boolean
  likesCount?: number
  replyTo?: string // For nested replies
}

export interface UserFollow {
  followerId: string
  followingId: string
  createdAt: number
}

export interface UserFriend {
  userId1: string
  userId2: string
  createdAt: number
}

export interface UserPrivacySettings {
  userId: string
  
  // Advanced user privacy features
  boldInSearches?: boolean
  boldInPosts?: boolean
  boldInComments?: boolean
  boldInFollowing?: boolean
  
  // Anonymous mode
  isAnonymous?: boolean
  hideFromFollowingLists?: boolean
  hideFromGroupMembers?: boolean
  
  updatedAt: number
}

export interface GroupInviteLink {
  id: string
  chatId: string
  code: string
  createdBy: string
  createdAt: number
  expiresAt?: number
  maxUses?: number
  currentUses: number
  isActive: boolean
}

export interface TempKickedUser {
  userId: string
  chatId: string
  kickedAt: number
  kickedUntil: number
  kickedBy: string
  reason?: string
}

// Username validation patterns
export const USERNAME_PATTERNS = {
  VALID_CHARS: /^[a-z0-9._]+$/,
  REPETITIVE: /(.)\1{4,}/, // 5+ same characters in a row
  MIN_LENGTH: 3,
  MAX_LENGTH: 30
}

export const validateUsername = (username: string): { valid: boolean; error?: string } => {
  if (!username) return { valid: false, error: 'Username is required' }
  
  if (username.length < USERNAME_PATTERNS.MIN_LENGTH) {
    return { valid: false, error: `Username must be at least ${USERNAME_PATTERNS.MIN_LENGTH} characters` }
  }
  
  if (username.length > USERNAME_PATTERNS.MAX_LENGTH) {
    return { valid: false, error: `Username must be no more than ${USERNAME_PATTERNS.MAX_LENGTH} characters` }
  }
  
  if (!USERNAME_PATTERNS.VALID_CHARS.test(username)) {
    return { valid: false, error: 'Username can only contain lowercase letters, numbers, periods, and underscores' }
  }
  
  if (USERNAME_PATTERNS.REPETITIVE.test(username)) {
    return { valid: false, error: 'Username cannot have repetitive patterns' }
  }
  
  return { valid: true }
}

// Color theme constants
export const FIREGRAM_COLORS = {
  primary: {
    blue: '#1e3a8a',
    red: '#dc2626',
    green: '#059669'
  },
  neutral: {
    black: '#000000',
    grey: '#6b7280',
    white: '#ffffff'
  }
}
