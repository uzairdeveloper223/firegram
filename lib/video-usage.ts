import { ref, get, set, update } from 'firebase/database'
import { database } from './firebase'
import { FiregramUser } from './types'

// User type limits (in seconds)
const USER_TYPE_LIMITS = {
  regular: 45 * 60, // 45 minutes per month
  verified: 60 * 60, // 1 hour per month
  advanced: 3 * 60 * 60 // 3 hours total
}

// Get user's video usage for the current month
export const getUserVideoUsage = async (userId: string): Promise<{ 
  totalDuration: number; 
  monthlyUsage: number;
  limit: number;
  remaining: number;
}> => {
  try {
    const userRef = ref(database, `users/${userId}`)
    const snapshot = await get(userRef)
    
    if (!snapshot.exists()) {
      throw new Error('User not found')
    }
    
    const userData = snapshot.val() as FiregramUser
    const userType = getUserType(userData)
    const limit = USER_TYPE_LIMITS[userType]
    
    // Get current month-year key (e.g., "2023-08")
    const now = new Date()
    const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    
    let totalDuration = 0
    let monthlyUsage = 0
    
    if (userData.videoUsage) {
      totalDuration = userData.videoUsage.totalDuration || 0
      monthlyUsage = userData.videoUsage.monthlyUsage?.[monthYear] || 0
    }
    
    return {
      totalDuration,
      monthlyUsage,
      limit,
      remaining: Math.max(0, limit - (userType === 'advanced' ? totalDuration : monthlyUsage))
    }
  } catch (error) {
    console.error('Error getting user video usage:', error)
    throw error
  }
}

// Add video duration to user's usage
export const addVideoUsage = async (userId: string, duration: number): Promise<boolean> => {
  try {
    const usage = await getUserVideoUsage(userId)
    
    // Check if user has exceeded their limit
    if (usage.remaining < duration) {
      return false // User has exceeded their limit
    }
    
    // Get current month-year key (e.g., "2023-08")
    const now = new Date()
    const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    
    // Update video usage
    const updates: any = {}
    updates[`videoUsage/totalDuration`] = usage.totalDuration + duration
    updates[`videoUsage/monthlyUsage/${monthYear}`] = usage.monthlyUsage + duration
    
    const userRef = ref(database, `users/${userId}`)
    await update(userRef, updates)
    
    return true
  } catch (error) {
    console.error('Error adding video usage:', error)
    return false
  }
}

// Get user type based on their profile
const getUserType = (user: FiregramUser): 'regular' | 'verified' | 'advanced' => {
  if (user.isAdvancedUser) {
    return 'advanced'
  } else if (user.isVerified) {
    return 'verified'
  } else {
    return 'regular'
  }
}

// Format time for display
export const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`
  } else {
    return `${secs}s`
  }
}