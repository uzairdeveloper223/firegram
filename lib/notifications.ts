"use client"

import { ref, push, set, get, query, orderByChild, equalTo, onValue, off, remove } from 'firebase/database'
import { database } from './firebase'
import { FiregramNotification } from './types'

// Create a notification
export const createNotification = async (
  userId: string,
  type: 'like' | 'comment' | 'follow' | 'mention' | 'message' | 'admin',
  fromUserId: string,
  content?: string,
  postId?: string,
  messageId?: string,
  chatId?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Don't create notification for self-actions
    if (userId === fromUserId) {
      return { success: true }
    }

    const notification: Omit<FiregramNotification, 'id'> = {
      userId,
      type,
      fromUserId,
      content,
      createdAt: Date.now(),
      isRead: false,
      ...(postId && postId !== '' && { postId }),
      ...(messageId && messageId !== '' && { messageId }),
      ...(chatId && chatId !== '' && { chatId })
    }

    const notificationsRef = ref(database, 'notifications')
    const newNotificationRef = push(notificationsRef)
    await set(newNotificationRef, notification)

    return { success: true }
  } catch (error: any) {
    console.error('Error creating notification:', error)
    return { success: false, error: error.message }
  }
}

// Get user's notifications
export const getUserNotifications = async (userId: string): Promise<FiregramNotification[]> => {
  try {
    // Use a simpler approach without complex indexing to avoid Firebase indexing issues
    const notificationsRef = ref(database, 'notifications')
    const snapshot = await get(notificationsRef)

    if (!snapshot.exists()) {
      return []
    }

    const notificationsData = snapshot.val()
    const notifications = Object.keys(notificationsData)
      .map(key => ({ id: key, ...notificationsData[key] }))
      .filter(notification => notification.userId === userId)
      .sort((a, b) => b.createdAt - a.createdAt)

    return notifications
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return []
  }
}

// Listen to user's notifications in real-time
export const listenToUserNotifications = (
  userId: string,
  callback: (notifications: FiregramNotification[]) => void
) => {
  const notificationsRef = ref(database, 'notifications')
  
  const unsubscribe = onValue(notificationsRef, (snapshot) => {
    if (snapshot.exists()) {
      const notificationsData = snapshot.val()
      const notifications = Object.keys(notificationsData)
        .map(key => ({ id: key, ...notificationsData[key] }))
        .filter(notification => notification.userId === userId)
        .sort((a, b) => b.createdAt - a.createdAt)
      callback(notifications)
    } else {
      callback([])
    }
  })

  return () => off(notificationsRef, 'value', unsubscribe)
}

// Mark notification as read
export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  try {
    await set(ref(database, `notifications/${notificationId}/isRead`), true)
  } catch (error) {
    console.error('Error marking notification as read:', error)
  }
}

// Mark all user notifications as read
export const markAllNotificationsAsRead = async (userId: string): Promise<void> => {
  try {
    const notifications = await getUserNotifications(userId)
    const updates: any = {}
    
    notifications.forEach(notification => {
      if (!notification.isRead) {
        updates[`notifications/${notification.id}/isRead`] = true
      }
    })

    if (Object.keys(updates).length > 0) {
      // Apply updates individually to avoid path conflicts
      for (const [path, value] of Object.entries(updates)) {
        await set(ref(database, path), value)
      }
    }
  } catch (error) {
    console.error('Error marking all notifications as read:', error)
  }
}

// Delete notification
export const deleteNotification = async (notificationId: string): Promise<void> => {
  try {
    await remove(ref(database, `notifications/${notificationId}`))
  } catch (error) {
    console.error('Error deleting notification:', error)
  }
}

// Get unread notifications count
export const getUnreadNotificationsCount = async (userId: string): Promise<number> => {
  try {
    const notifications = await getUserNotifications(userId)
    return notifications.filter(n => !n.isRead).length
  } catch (error) {
    console.error('Error getting unread count:', error)
    return 0
  }
}

// Notification helpers for specific actions
export const notifyLike = async (postAuthorId: string, likerId: string, postId: string) => {
  return createNotification(
    postAuthorId,
    'like',
    likerId,
    'liked your post',
    postId
  )
}

export const notifyComment = async (postAuthorId: string, commenterId: string, postId: string, commentContent: string) => {
  return createNotification(
    postAuthorId,
    'comment',
    commenterId,
    `commented: "${commentContent.substring(0, 50)}${commentContent.length > 50 ? '...' : ''}"`,
    postId
  )
}

export const notifyFollow = async (followedUserId: string, followerId: string) => {
  return createNotification(
    followedUserId,
    'follow',
    followerId,
    'started following you'
  )
}

export const notifyMention = async (mentionedUserId: string, mentionerId: string, postId: string, content: string) => {
  return createNotification(
    mentionedUserId,
    'mention',
    mentionerId,
    `mentioned you in a post: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
    postId
  )
}

export const notifyMessage = async (recipientId: string, senderId: string, messageId: string, chatId: string, messageContent: string) => {
  return createNotification(
    recipientId,
    'message',
    senderId,
    `sent you a message: "${messageContent.substring(0, 50)}${messageContent.length > 50 ? '...' : ''}"`,
    '', // empty string instead of undefined
    messageId,
    chatId
  )
}

export const notifyAdmin = async (userId: string, adminId: string, content: string) => {
  return createNotification(
    userId,
    'admin',
    adminId,
    content
  )
}

// Bulk notification for group messages
export const notifyGroupMessage = async (
  chatParticipants: string[],
  senderId: string,
  messageId: string,
  chatId: string,
  messageContent: string,
  groupName?: string
) => {
  const promises = chatParticipants
    .filter(participantId => participantId !== senderId)
    .map(participantId => 
      createNotification(
        participantId,
        'message',
        senderId,
        `${groupName ? `in ${groupName}` : 'in group'}: "${messageContent.substring(0, 50)}${messageContent.length > 50 ? '...' : ''}"`,
        '', // empty string instead of undefined
        messageId,
        chatId
      )
    )

  await Promise.all(promises)
}
