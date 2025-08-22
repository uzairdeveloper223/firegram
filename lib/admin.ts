"use client"

import { ref, set, get, onValue, off, query, orderByChild, push } from 'firebase/database'
import { database } from './firebase'
import { FiregramUser } from './types'

const ADMIN_EMAIL = "uzairxdev223@gmail.com"

export interface AdminSettings {
  maintenanceMode: {
    enabled: boolean
    message: string
    endTime?: number // UTC+5 timestamp
    startTime?: number
  }
  verificationEnabled: boolean
  postModerationEnabled: boolean
  registrationEnabled: boolean
}

export interface UserBan {
  id: string
  userId: string
  reason: string
  type: 'temporary' | 'permanent'
  bannedAt: number
  bannedBy: string
  endTime?: number // For temporary bans (UTC+5)
  isActive: boolean
}

export interface VerificationRequest {
  id: string
  userId: string
  username: string
  fullName: string
  reason: string
  submittedAt: number
  status: 'pending' | 'approved' | 'rejected'
  reviewedBy?: string
  reviewedAt?: number
  notes?: string
}

export interface AdvancedUserRequest {
  id: string
  userId: string
  username: string
  fullName: string
  reason: string
  submittedAt: number
  status: 'pending' | 'approved' | 'rejected'
  reviewedBy?: string
  reviewedAt?: number
  notes?: string
}

export interface UnbanRequest {
  id: string
  userId: string
  username: string
  reason: string
  submittedAt: number
  status: 'pending' | 'approved' | 'rejected'
  reviewedBy?: string
  reviewedAt?: number
  banId: string
}

export interface AppStats {
  totalUsers: number
  activeUsers: number
  totalPosts: number
  totalMessages: number
  verifiedUsers: number
  advancedUsers: number
  bannedUsers: number
  pendingVerifications: number
  pendingAdvancedRequests: number
  pendingUnbanRequests: number
}

// Check if user is admin
export const isAdmin = (email: string): boolean => {
  return email === ADMIN_EMAIL
}

// Get admin settings
export const getAdminSettings = async (): Promise<AdminSettings> => {
  try {
    const settingsRef = ref(database, 'adminSettings')
    const snapshot = await get(settingsRef)
    
    if (snapshot.exists()) {
      return snapshot.val()
    }
    
    // Default settings
    const defaultSettings: AdminSettings = {
      maintenanceMode: {
        enabled: false,
        message: 'Firegram is currently under maintenance. Please check back soon!',
      },
      verificationEnabled: true,
      postModerationEnabled: false,
      registrationEnabled: true
    }
    
    await set(settingsRef, defaultSettings)
    return defaultSettings
  } catch (error) {
    console.error('Error getting admin settings:', error)
    throw error
  }
}

// Update admin settings
export const updateAdminSettings = async (settings: Partial<AdminSettings>): Promise<void> => {
  try {
    const settingsRef = ref(database, 'adminSettings')
    const currentSettings = await getAdminSettings()
    const updatedSettings = { ...currentSettings, ...settings }
    await set(settingsRef, updatedSettings)
  } catch (error) {
    console.error('Error updating admin settings:', error)
    throw error
  }
}

// Enable/Disable maintenance mode
export const setMaintenanceMode = async (
  enabled: boolean,
  message: string = 'Firegram is currently under maintenance. Please check back soon!',
  durationHours?: number
): Promise<void> => {
  try {
    const now = new Date()
    // Convert to UTC+5
    const utcPlus5 = new Date(now.getTime() + (5 * 60 * 60 * 1000))
    
    const maintenanceMode: any = {
      enabled,
      message
    }
    
    // Only add startTime and endTime if they have valid values
    if (enabled) {
      maintenanceMode.startTime = utcPlus5.getTime()
      if (durationHours && durationHours > 0) {
        maintenanceMode.endTime = utcPlus5.getTime() + (durationHours * 60 * 60 * 1000)
      }
    }
    
    await updateAdminSettings({ maintenanceMode })
  } catch (error) {
    console.error('Error setting maintenance mode:', error)
    throw error
  }
}

// Check and auto-disable maintenance mode if expired
export const checkAndAutoDisableMaintenance = async (): Promise<boolean> => {
  try {
    const settings = await getAdminSettings()
    
    if (!settings.maintenanceMode.enabled || !settings.maintenanceMode.endTime) {
      return false
    }
    
    const now = new Date()
    const utcPlus5 = new Date(now.getTime() + (5 * 60 * 60 * 1000))
    
    // Check if maintenance period has expired
    if (utcPlus5.getTime() > settings.maintenanceMode.endTime) {
      console.log('Maintenance period expired, auto-disabling...')
      await setMaintenanceMode(false, settings.maintenanceMode.message)
      return true // Maintenance was auto-disabled
    }
    
    return false // Maintenance is still active
  } catch (error) {
    console.error('Error checking maintenance auto-disable:', error)
    return false
  }
}

// Ban user
export const banUser = async (
  userId: string,
  reason: string,
  type: 'temporary' | 'permanent',
  adminId: string,
  durationHours?: number
): Promise<string> => {
  try {
    const now = new Date()
    const utcPlus5 = new Date(now.getTime() + (5 * 60 * 60 * 1000))
    
    const ban: Omit<UserBan, 'id'> = {
      userId,
      reason,
      type,
      bannedAt: utcPlus5.getTime(),
      bannedBy: adminId,
      endTime: type === 'temporary' && durationHours ? 
        utcPlus5.getTime() + (durationHours * 60 * 60 * 1000) : undefined,
      isActive: true
    }
    
    const bansRef = ref(database, 'userBans')
    const newBanRef = push(bansRef)
    await set(newBanRef, ban)
    
    // Update user status
    await set(ref(database, `users/${userId}/isBanned`), true)
    await set(ref(database, `users/${userId}/banId`), newBanRef.key)
    
    return newBanRef.key!
  } catch (error) {
    console.error('Error banning user:', error)
    throw error
  }
}

// Unban user
export const unbanUser = async (userId: string, banId: string): Promise<void> => {
  try {
    // Deactivate ban
    await set(ref(database, `userBans/${banId}/isActive`), false)
    
    // Update user status
    await set(ref(database, `users/${userId}/isBanned`), false)
    await set(ref(database, `users/${userId}/banId`), null)
  } catch (error) {
    console.error('Error unbanning user:', error)
    throw error
  }
}

// Check if user is banned
export const checkUserBanStatus = async (userId: string): Promise<UserBan | null> => {
  try {
    const userRef = ref(database, `users/${userId}`)
    const userSnapshot = await get(userRef)
    
    if (!userSnapshot.exists()) return null
    
    const userData = userSnapshot.val()
    if (!userData.isBanned || !userData.banId) return null
    
    const banRef = ref(database, `userBans/${userData.banId}`)
    const banSnapshot = await get(banRef)
    
    if (!banSnapshot.exists()) return null
    
    const banData = banSnapshot.val() as UserBan
    
    // Check if temporary ban has expired
    if (banData.type === 'temporary' && banData.endTime) {
      const now = new Date()
      const utcPlus5 = new Date(now.getTime() + (5 * 60 * 60 * 1000))
      
      if (utcPlus5.getTime() > banData.endTime) {
        // Auto-unban
        await unbanUser(userId, userData.banId)
        return null
      }
    }
    
    return { ...banData, id: userData.banId }
  } catch (error) {
    console.error('Error checking ban status:', error)
    return null
  }
}

// Submit verification request
export const submitVerificationRequest = async (
  userId: string,
  username: string,
  fullName: string,
  reason: string
): Promise<string> => {
  try {
    const request: Omit<VerificationRequest, 'id'> = {
      userId,
      username,
      fullName,
      reason,
      submittedAt: Date.now(),
      status: 'pending'
    }
    
    const requestsRef = ref(database, 'verificationRequests')
    const newRequestRef = push(requestsRef)
    await set(newRequestRef, request)
    
    return newRequestRef.key!
  } catch (error) {
    console.error('Error submitting verification request:', error)
    throw error
  }
}

// Submit advanced user request
export const submitAdvancedUserRequest = async (
  userId: string,
  username: string,
  fullName: string,
  reason: string
): Promise<string> => {
  try {
    const request: Omit<AdvancedUserRequest, 'id'> = {
      userId,
      username,
      fullName,
      reason,
      submittedAt: Date.now(),
      status: 'pending'
    }
    
    const requestsRef = ref(database, 'advancedUserRequests')
    const newRequestRef = push(requestsRef)
    await set(newRequestRef, request)
    
    return newRequestRef.key!
  } catch (error) {
    console.error('Error submitting advanced user request:', error)
    throw error
  }
}

// Submit unban request
export const submitUnbanRequest = async (
  userId: string,
  username: string,
  reason: string,
  banId: string
): Promise<string> => {
  try {
    const request: Omit<UnbanRequest, 'id'> = {
      userId,
      username,
      reason,
      submittedAt: Date.now(),
      status: 'pending',
      banId
    }
    
    const requestsRef = ref(database, 'unbanRequests')
    const newRequestRef = push(requestsRef)
    await set(newRequestRef, request)
    
    return newRequestRef.key!
  } catch (error) {
    console.error('Error submitting unban request:', error)
    throw error
  }
}

// Process verification request
export const processVerificationRequest = async (
  requestId: string,
  status: 'approved' | 'rejected',
  adminId: string,
  notes?: string
): Promise<void> => {
  try {
    const requestRef = ref(database, `verificationRequests/${requestId}`)
    const requestSnapshot = await get(requestRef)
    
    if (!requestSnapshot.exists()) throw new Error('Request not found')
    
    const requestData = requestSnapshot.val() as VerificationRequest
    
    // Update request
    await set(requestRef, {
      ...requestData,
      status,
      reviewedBy: adminId,
      reviewedAt: Date.now(),
      notes
    })
    
    // If approved, update user
    if (status === 'approved') {
      await set(ref(database, `users/${requestData.userId}/isVerified`), true)
    }
  } catch (error) {
    console.error('Error processing verification request:', error)
    throw error
  }
}

// Process advanced user request
export const processAdvancedUserRequest = async (
  requestId: string,
  status: 'approved' | 'rejected',
  adminId: string,
  notes?: string
): Promise<void> => {
  try {
    const requestRef = ref(database, `advancedUserRequests/${requestId}`)
    const requestSnapshot = await get(requestRef)
    
    if (!requestSnapshot.exists()) throw new Error('Request not found')
    
    const requestData = requestSnapshot.val() as AdvancedUserRequest
    
    // Update request
    await set(requestRef, {
      ...requestData,
      status,
      reviewedBy: adminId,
      reviewedAt: Date.now(),
      notes
    })
    
    // If approved, update user
    if (status === 'approved') {
      await set(ref(database, `users/${requestData.userId}/isAdvancedUser`), true)
    }
  } catch (error) {
    console.error('Error processing advanced user request:', error)
    throw error
  }
}

// Process unban request
export const processUnbanRequest = async (
  requestId: string,
  status: 'approved' | 'rejected',
  adminId: string
): Promise<void> => {
  try {
    const requestRef = ref(database, `unbanRequests/${requestId}`)
    const requestSnapshot = await get(requestRef)
    
    if (!requestSnapshot.exists()) throw new Error('Request not found')
    
    const requestData = requestSnapshot.val() as UnbanRequest
    
    // Update request
    await set(requestRef, {
      ...requestData,
      status,
      reviewedBy: adminId,
      reviewedAt: Date.now()
    })
    
    // If approved, unban user
    if (status === 'approved') {
      await unbanUser(requestData.userId, requestData.banId)
    }
  } catch (error) {
    console.error('Error processing unban request:', error)
    throw error
  }
}

// Get app statistics
export const getAppStats = async (): Promise<AppStats> => {
  try {
    const [users, posts, messages, bans, verificationRequests, advancedRequests, unbanRequests] = await Promise.all([
      get(ref(database, 'users')),
      get(ref(database, 'posts')),
      get(ref(database, 'messages')),
      get(ref(database, 'userBans')),
      get(ref(database, 'verificationRequests')),
      get(ref(database, 'advancedUserRequests')),
      get(ref(database, 'unbanRequests'))
    ])

    const usersData = users.exists() ? users.val() : {}
    const postsData = posts.exists() ? posts.val() : {}
    const messagesData = messages.exists() ? messages.val() : {}
    const bansData = bans.exists() ? bans.val() : {}
    const verificationData = verificationRequests.exists() ? verificationRequests.val() : {}
    const advancedData = advancedRequests.exists() ? advancedRequests.val() : {}
    const unbanData = unbanRequests.exists() ? unbanRequests.val() : {}

    const userArray = Object.values(usersData) as FiregramUser[]
    const now = Date.now()
    const oneDayAgo = now - (24 * 60 * 60 * 1000)

    return {
      totalUsers: userArray.length,
      activeUsers: userArray.filter(user => user.lastActive && user.lastActive > oneDayAgo).length,
      totalPosts: Object.keys(postsData).length,
      totalMessages: Object.values(messagesData).reduce((total: number, chatMessages: any) =>
        total + (chatMessages ? Object.keys(chatMessages).length : 0), 0),
      verifiedUsers: userArray.filter(user => user.isVerified).length,
      advancedUsers: userArray.filter(user => user.isAdvancedUser).length,
      bannedUsers: userArray.filter((user: any) => user.isBanned).length,
      pendingVerifications: Object.values(verificationData).filter((req: any) => req.status === 'pending').length,
      pendingAdvancedRequests: Object.values(advancedData).filter((req: any) => req.status === 'pending').length,
      pendingUnbanRequests: Object.values(unbanData).filter((req: any) => req.status === 'pending').length
    }
  } catch (error) {
    console.error('Error getting app stats:', error)
    throw error
  }
}

// Listen to admin settings changes
export const listenToAdminSettings = (callback: (settings: AdminSettings) => void) => {
  const settingsRef = ref(database, 'adminSettings')
  
  const unsubscribe = onValue(settingsRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val())
    }
  })
  
  return () => off(settingsRef, 'value', unsubscribe)
}
