"use client"

import { ref, push, set, get, query, orderByChild, equalTo, onValue, off, remove } from 'firebase/database'
import { database } from './firebase'
import { FiregramChat, GroupInviteLink, TempKickedUser, UserPrivacySettings } from './types'
import { sendMessage, removeUserFromGroup } from './messaging'

// Generate unique invite code
const generateInviteCode = (): string => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

// Create group invite link
export const createGroupInviteLink = async (
  chatId: string,
  createdBy: string,
  expiresAt?: number,
  maxUses?: number
): Promise<{ success: boolean; error?: string; inviteLink?: GroupInviteLink }> => {
  try {
    const chatRef = ref(database, `chats/${chatId}`)
    const chatSnapshot = await get(chatRef)

    if (!chatSnapshot.exists()) {
      return { success: false, error: 'Chat not found' }
    }

    const chatData = chatSnapshot.val() as FiregramChat
    
    if (chatData.type !== 'group') {
      return { success: false, error: 'This is not a group chat' }
    }

    if (!chatData.adminIds?.includes(createdBy)) {
      return { success: false, error: 'Only admins can create invite links' }
    }

    const inviteCode = generateInviteCode()
    const inviteLink: Omit<GroupInviteLink, 'id'> = {
      chatId,
      code: inviteCode,
      createdBy,
      createdAt: Date.now(),
      expiresAt,
      maxUses,
      currentUses: 0,
      isActive: true
    }

    const inviteLinksRef = ref(database, 'groupInviteLinks')
    const newInviteLinkRef = push(inviteLinksRef)
    await set(newInviteLinkRef, inviteLink)

    // Update chat with invite link
    await set(ref(database, `chats/${chatId}/inviteLink`), inviteCode)

    return { 
      success: true, 
      inviteLink: { id: newInviteLinkRef.key!, ...inviteLink }
    }
  } catch (error: any) {
    console.error('Error creating invite link:', error)
    return { success: false, error: error.message }
  }
}

// Join group via invite link
export const joinGroupViaInvite = async (
  inviteCode: string,
  userId: string
): Promise<{ success: boolean; error?: string; chatId?: string }> => {
  try {
    // Find invite link
    const inviteLinksRef = ref(database, 'groupInviteLinks')
    const snapshot = await get(inviteLinksRef)

    if (!snapshot.exists()) {
      return { success: false, error: 'Invalid invite link' }
    }

    let inviteLink: GroupInviteLink | null = null
    let inviteLinkId: string | null = null

    const inviteLinksData = snapshot.val()
    for (const id of Object.keys(inviteLinksData)) {
      const link = inviteLinksData[id]
      if (link.code === inviteCode && link.isActive) {
        inviteLink = { id, ...link }
        inviteLinkId = id
        break
      }
    }

    if (!inviteLink) {
      return { success: false, error: 'Invalid or expired invite link' }
    }

    // Check expiry
    if (inviteLink.expiresAt && Date.now() > inviteLink.expiresAt) {
      return { success: false, error: 'Invite link has expired' }
    }

    // Check max uses
    if (inviteLink.maxUses && inviteLink.currentUses >= inviteLink.maxUses) {
      return { success: false, error: 'Invite link has reached maximum uses' }
    }

    // Get chat data
    const chatRef = ref(database, `chats/${inviteLink.chatId}`)
    const chatSnapshot = await get(chatRef)

    if (!chatSnapshot.exists()) {
      return { success: false, error: 'Group not found' }
    }

    const chatData = chatSnapshot.val() as FiregramChat

    // Check if user is already in group
    if (chatData.participants.includes(userId)) {
      return { success: false, error: 'You are already in this group' }
    }

    // Add user to group
    const newParticipants = [...chatData.participants, userId]
    await set(ref(database, `chats/${inviteLink.chatId}/participants`), newParticipants)

    // Add chat to user's chat list
    await set(ref(database, `userChats/${userId}/${inviteLink.chatId}`), {
      chatId: inviteLink.chatId,
      joinedAt: Date.now(),
      lastRead: Date.now()
    })

    // Increment invite link usage
    await set(ref(database, `groupInviteLinks/${inviteLinkId}/currentUses`), inviteLink.currentUses + 1)

    // Send system message
    await sendMessage(inviteLink.chatId, 'system', {
      content: `User joined the group via invite link`,
      type: 'text'
    })

    return { success: true, chatId: inviteLink.chatId }
  } catch (error: any) {
    console.error('Error joining group via invite:', error)
    return { success: false, error: error.message }
  }
}

// Check if message contains banned words
export const checkBannedWords = (message: string, bannedWords: string[]): boolean => {
  const messageWords = message.toLowerCase().split(/\s+/)
  const bannedWordsLower = bannedWords.map(word => word.toLowerCase().trim())
  
  return messageWords.some(word => 
    bannedWordsLower.some(bannedWord => 
      word.includes(bannedWord) || bannedWord.includes(word)
    )
  )
}

// Handle user violation (kick or temp kick)
export const handleUserViolation = async (
  chatId: string,
  userId: string,
  adminId: string,
  violationType: 'banned_word'
): Promise<{ success: boolean; error?: string }> => {
  try {
    const chatRef = ref(database, `chats/${chatId}`)
    const chatSnapshot = await get(chatRef)

    if (!chatSnapshot.exists()) {
      return { success: false, error: 'Chat not found' }
    }

    const chatData = chatSnapshot.val() as FiregramChat
    
    if (!chatData.adminIds?.includes(adminId)) {
      return { success: false, error: 'Only admins can handle violations' }
    }

    if (chatData.kickBehavior === 'temp_kick') {
      // Temporary kick
      const kickDuration = chatData.tempKickDuration || 24 // Default 24 hours
      const kickedUntil = Date.now() + (kickDuration * 60 * 60 * 1000)

      const tempKick: Omit<TempKickedUser, 'id'> = {
        userId,
        chatId,
        kickedAt: Date.now(),
        kickedUntil,
        kickedBy: adminId,
        reason: `Used banned word (${violationType})`
      }

      const tempKicksRef = ref(database, 'tempKickedUsers')
      const newTempKickRef = push(tempKicksRef)
      await set(newTempKickRef, tempKick)

      // Remove from participants temporarily
      const newParticipants = chatData.participants.filter(id => id !== userId)
      await set(ref(database, `chats/${chatId}/participants`), newParticipants)

      // Send system message
      await sendMessage(chatId, 'system', {
        content: `User was temporarily kicked for ${kickDuration} hours for using banned words`,
        type: 'text'
      })
    } else {
      // Permanent kick
      const result = await removeUserFromGroup(chatId, userId, adminId)
      if (!result.success) {
        return result
      }

      // Send system message
      await sendMessage(chatId, 'system', {
        content: `User was kicked for using banned words`,
        type: 'text'
      })
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error handling user violation:', error)
    return { success: false, error: error.message }
  }
}

// Check and restore temp kicked users
export const checkTempKickedUsers = async (): Promise<void> => {
  try {
    const tempKicksRef = ref(database, 'tempKickedUsers')
    const snapshot = await get(tempKicksRef)

    if (!snapshot.exists()) return

    const tempKicksData = snapshot.val()
    const now = Date.now()

    for (const kickId of Object.keys(tempKicksData)) {
      const tempKick = tempKicksData[kickId] as TempKickedUser

      if (now >= tempKick.kickedUntil) {
        // Restore user to group
        const chatRef = ref(database, `chats/${tempKick.chatId}`)
        const chatSnapshot = await get(chatRef)

        if (chatSnapshot.exists()) {
          const chatData = chatSnapshot.val() as FiregramChat
          const newParticipants = [...chatData.participants, tempKick.userId]
          await set(ref(database, `chats/${tempKick.chatId}/participants`), newParticipants)

          // Add chat back to user's chat list
          await set(ref(database, `userChats/${tempKick.userId}/${tempKick.chatId}`), {
            chatId: tempKick.chatId,
            joinedAt: Date.now(),
            lastRead: Date.now()
          })

          // Send system message
          await sendMessage(tempKick.chatId, 'system', {
            content: `User has been restored to the group`,
            type: 'text'
          })
        }

        // Remove temp kick record
        await remove(ref(database, `tempKickedUsers/${kickId}`))
      }
    }
  } catch (error) {
    console.error('Error checking temp kicked users:', error)
  }
}

// Update group settings
export const updateGroupSettings = async (
  chatId: string,
  adminId: string,
  settings: {
    bannedWords?: string[]
    kickBehavior?: 'kick' | 'temp_kick'
    tempKickDuration?: number
    postsDisabled?: boolean
  }
): Promise<{ success: boolean; error?: string }> => {
  try {
    const chatRef = ref(database, `chats/${chatId}`)
    const chatSnapshot = await get(chatRef)

    if (!chatSnapshot.exists()) {
      return { success: false, error: 'Chat not found' }
    }

    const chatData = chatSnapshot.val() as FiregramChat
    
    if (chatData.type !== 'group') {
      return { success: false, error: 'This is not a group chat' }
    }

    if (!chatData.adminIds?.includes(adminId)) {
      return { success: false, error: 'Only admins can update group settings' }
    }

    // Update settings
    const updates: any = {}
    if (settings.bannedWords !== undefined) {
      updates[`chats/${chatId}/bannedWords`] = settings.bannedWords
    }
    if (settings.kickBehavior !== undefined) {
      updates[`chats/${chatId}/kickBehavior`] = settings.kickBehavior
    }
    if (settings.tempKickDuration !== undefined) {
      updates[`chats/${chatId}/tempKickDuration`] = settings.tempKickDuration
    }
    if (settings.postsDisabled !== undefined) {
      updates[`chats/${chatId}/postsDisabled`] = settings.postsDisabled
    }

    // Apply updates individually to avoid path conflicts
    for (const [path, value] of Object.entries(updates)) {
      await set(ref(database, path), value)
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error updating group settings:', error)
    return { success: false, error: error.message }
  }
}

// Get user privacy settings
export const getUserPrivacySettings = async (userId: string): Promise<UserPrivacySettings | null> => {
  try {
    const settingsRef = ref(database, `userPrivacySettings/${userId}`)
    const snapshot = await get(settingsRef)

    if (snapshot.exists()) {
      return snapshot.val()
    }

    return null
  } catch (error) {
    console.error('Error fetching privacy settings:', error)
    return null
  }
}

// Update user privacy settings
export const updateUserPrivacySettings = async (
  userId: string,
  settings: Partial<UserPrivacySettings>
): Promise<{ success: boolean; error?: string }> => {
  try {
    const updatedSettings: UserPrivacySettings = {
      userId,
      boldInSearches: settings.boldInSearches || false,
      boldInPosts: settings.boldInPosts || false,
      boldInComments: settings.boldInComments || false,
      boldInFollowing: settings.boldInFollowing || false,
      isAnonymous: settings.isAnonymous || false,
      hideFromFollowingLists: settings.hideFromFollowingLists || false,
      hideFromGroupMembers: settings.hideFromGroupMembers || false,
      updatedAt: Date.now()
    }

    await set(ref(database, `userPrivacySettings/${userId}`), updatedSettings)

    return { success: true }
  } catch (error: any) {
    console.error('Error updating privacy settings:', error)
    return { success: false, error: error.message }
  }
}

// Share post to chat
export const sharePostToChat = async (
  postId: string,
  chatId: string,
  senderId: string,
  message?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const content = message || 'Shared a post'
    
    return await sendMessage(chatId, senderId, {
      content,
      type: 'post_share',
      sharedPostId: postId
    })
  } catch (error: any) {
    console.error('Error sharing post:', error)
    return { success: false, error: error.message }
  }
}
