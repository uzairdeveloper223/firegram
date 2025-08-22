"use client"

import { ref, push, set, get, query, orderByChild, equalTo, onValue, off, remove } from 'firebase/database'
import { database } from './firebase'
import { FiregramMessage, FiregramChat } from './types'

export interface SendMessageData {
  content: string
  type: 'text' | 'image' | 'video' | 'file' | 'post_share'
  mediaUrl?: string
  mediaType?: string
  duration?: number
  replyTo?: string
  sharedPostId?: string
}

export interface CreateChatData {
  type: 'private' | 'group'
  participants: string[]
  name?: string
  description?: string
  isAdvancedOnly?: boolean
}

export interface MessageResult {
  success: boolean
  error?: string
  messageId?: string
  chatId?: string
}

// Create a new chat
export const createChat = async (data: CreateChatData): Promise<MessageResult> => {
  try {
    const chat: Omit<FiregramChat, 'id'> = {
      type: data.type,
      participants: data.participants,
      createdAt: Date.now(),
      lastMessageAt: Date.now(),
      isAdvancedOnly: data.isAdvancedOnly || false,
      isMuted: false,
      ...(data.type === 'group' && { 
        name: data.name || 'Unnamed Group',
        adminIds: [data.participants[0]]
      }),
      ...(data.type === 'private' && data.name && { name: data.name }),
      ...(data.description && { description: data.description })
    }

    const chatsRef = ref(database, 'chats')
    const newChatRef = push(chatsRef)
    await set(newChatRef, chat)

    // Add chat to each participant's chat list
    for (const participantId of data.participants) {
      await set(ref(database, `userChats/${participantId}/${newChatRef.key}`), {
        chatId: newChatRef.key,
        joinedAt: Date.now(),
        lastRead: Date.now()
      })
    }

    return { success: true, chatId: newChatRef.key || undefined }
  } catch (error: any) {
    console.error('Error creating chat:', error)
    return { success: false, error: error.message }
  }
}

// Send a message
export const sendMessage = async (
  chatId: string,
  senderId: string,
  data: SendMessageData
): Promise<MessageResult> => {
  try {
    // Check if user is participant in chat
    const chatRef = ref(database, `chats/${chatId}`)
    const chatSnapshot = await get(chatRef)
    
    if (!chatSnapshot.exists()) {
      return { success: false, error: 'Chat not found' }
    }

    const chatData = chatSnapshot.val() as FiregramChat
    if (!chatData.participants.includes(senderId) && senderId !== 'system') {
      return { success: false, error: 'You are not a participant in this chat' }
    }

    // Check banned words for group chats
    if (chatData.type === 'group' && chatData.bannedWords && senderId !== 'system') {
      const { checkBannedWords, handleUserViolation } = await import('./advanced-messaging')
      
      if (checkBannedWords(data.content, chatData.bannedWords)) {
        // Handle violation (kick or temp kick)
        await handleUserViolation(chatId, senderId, chatData.adminIds?.[0] || '', 'banned_word')
        return { success: false, error: 'Message contains banned words. You have been kicked from the group.' }
      }
    }

    const message: Omit<FiregramMessage, 'id'> = {
      chatId,
      senderId,
      content: data.content,
      type: data.type,
      createdAt: Date.now(),
      isEdited: false,
      isDeleted: false,
      isForwarded: false,
      ...(data.replyTo && { replyTo: data.replyTo }),
      ...(data.mediaUrl && { mediaUrl: data.mediaUrl }),
      ...(data.mediaType && { mediaType: data.mediaType }),
      ...(data.duration && { duration: data.duration }),
      ...(data.sharedPostId && { sharedPostId: data.sharedPostId })
    }

    // Add message to database
    const messagesRef = ref(database, `messages/${chatId}`)
    const newMessageRef = push(messagesRef)
    await set(newMessageRef, message)

    // Update chat's last message time
    await set(ref(database, `chats/${chatId}/lastMessageAt`), Date.now())

    // Update last read for sender
    await set(ref(database, `userChats/${senderId}/${chatId}/lastRead`), Date.now())

    // Create notifications for other participants
    if (senderId !== 'system') {
      const { notifyMessage, notifyGroupMessage } = await import('./notifications')
      
      if (chatData.type === 'private') {
        // Notify the other participant in private chat
        const otherParticipant = chatData.participants.find(id => id !== senderId)
        if (otherParticipant) {
          await notifyMessage(otherParticipant, senderId, newMessageRef.key || '', chatId, data.content)
        }
      } else if (chatData.type === 'group') {
        // Notify all group members except sender
        await notifyGroupMessage(
          chatData.participants,
          senderId,
          newMessageRef.key || '',
          chatId,
          data.content,
          chatData.name
        )
      }
    }

    return { success: true, messageId: newMessageRef.key || undefined }
  } catch (error: any) {
    console.error('Error sending message:', error)
    return { success: false, error: error.message }
  }
}

// Get user's chats
export const getUserChats = async (userId: string): Promise<FiregramChat[]> => {
  try {
    const userChatsRef = ref(database, `userChats/${userId}`)
    const snapshot = await get(userChatsRef)

    if (!snapshot.exists()) {
      return []
    }

    const userChatsData = snapshot.val()
    const chatIds = Object.keys(userChatsData)
    const chats: FiregramChat[] = []

    for (const chatId of chatIds) {
      const chatRef = ref(database, `chats/${chatId}`)
      const chatSnapshot = await get(chatRef)
      
      if (chatSnapshot.exists()) {
        chats.push({ id: chatId, ...chatSnapshot.val() })
      }
    }

    return chats.sort((a, b) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0))
  } catch (error) {
    console.error('Error fetching user chats:', error)
    return []
  }
}

// Get chat messages
export const getChatMessages = async (chatId: string): Promise<FiregramMessage[]> => {
  try {
    const messagesRef = ref(database, `messages/${chatId}`)
    const snapshot = await get(messagesRef)

    if (!snapshot.exists()) {
      return []
    }

    const messagesData = snapshot.val()
    return Object.keys(messagesData)
      .map(key => ({ id: key, ...messagesData[key] }))
      .sort((a, b) => a.createdAt - b.createdAt)
  } catch (error) {
    console.error('Error fetching messages:', error)
    return []
  }
}

// Listen to chat messages in real-time
export const listenToChatMessages = (
  chatId: string, 
  callback: (messages: FiregramMessage[]) => void
) => {
  const messagesRef = ref(database, `messages/${chatId}`)
  
  const unsubscribe = onValue(messagesRef, (snapshot) => {
    if (snapshot.exists()) {
      const messagesData = snapshot.val()
      const messages = Object.keys(messagesData)
        .map(key => ({ id: key, ...messagesData[key] }))
        .sort((a, b) => a.createdAt - b.createdAt)
      callback(messages)
    } else {
      callback([])
    }
  })

  return () => off(messagesRef, 'value', unsubscribe)
}

// Listen to user chats in real-time
export const listenToUserChats = (
  userId: string,
  callback: (chats: FiregramChat[]) => void
) => {
  const userChatsRef = ref(database, `userChats/${userId}`)
  
  const unsubscribe = onValue(userChatsRef, async (snapshot) => {
    if (snapshot.exists()) {
      const userChatsData = snapshot.val()
      const chatIds = Object.keys(userChatsData)
      const chats: FiregramChat[] = []

      for (const chatId of chatIds) {
        const chatRef = ref(database, `chats/${chatId}`)
        const chatSnapshot = await get(chatRef)
        
        if (chatSnapshot.exists()) {
          chats.push({ id: chatId, ...chatSnapshot.val() })
        }
      }

      callback(chats.sort((a, b) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0)))
    } else {
      callback([])
    }
  })

  return () => off(userChatsRef, 'value', unsubscribe)
}

// Edit message
export const editMessage = async (
  messageId: string,
  chatId: string,
  newContent: string,
  senderId: string
): Promise<MessageResult> => {
  try {
    const messageRef = ref(database, `messages/${chatId}/${messageId}`)
    const messageSnapshot = await get(messageRef)

    if (!messageSnapshot.exists()) {
      return { success: false, error: 'Message not found' }
    }

    const messageData = messageSnapshot.val()
    if (messageData.senderId !== senderId) {
      return { success: false, error: 'You can only edit your own messages' }
    }

    await set(ref(database, `messages/${chatId}/${messageId}/content`), newContent)
    await set(ref(database, `messages/${chatId}/${messageId}/isEdited`), true)
    await set(ref(database, `messages/${chatId}/${messageId}/updatedAt`), Date.now())

    return { success: true }
  } catch (error: any) {
    console.error('Error editing message:', error)
    return { success: false, error: error.message }
  }
}

// Delete message
export const deleteMessage = async (
  messageId: string,
  chatId: string,
  senderId: string
): Promise<MessageResult> => {
  try {
    const messageRef = ref(database, `messages/${chatId}/${messageId}`)
    const messageSnapshot = await get(messageRef)

    if (!messageSnapshot.exists()) {
      return { success: false, error: 'Message not found' }
    }

    const messageData = messageSnapshot.val()
    if (messageData.senderId !== senderId) {
      return { success: false, error: 'You can only delete your own messages' }
    }

    await set(ref(database, `messages/${chatId}/${messageId}/isDeleted`), true)
    await set(ref(database, `messages/${chatId}/${messageId}/content`), 'This message was deleted')
    await set(ref(database, `messages/${chatId}/${messageId}/updatedAt`), Date.now())

    return { success: true }
  } catch (error: any) {
    console.error('Error deleting message:', error)
    return { success: false, error: error.message }
  }
}

// Mark messages as read
export const markMessagesAsRead = async (chatId: string, userId: string): Promise<void> => {
  try {
    await set(ref(database, `userChats/${userId}/${chatId}/lastRead`), Date.now())
  } catch (error) {
    console.error('Error marking messages as read:', error)
  }
}

// Start private chat between two users
export const startPrivateChat = async (userId1: string, userId2: string): Promise<MessageResult> => {
  try {
    // Check if private chat already exists
    const userChatsRef = ref(database, `userChats/${userId1}`)
    const snapshot = await get(userChatsRef)

    if (snapshot.exists()) {
      const userChatsData = snapshot.val()
      
      for (const chatId of Object.keys(userChatsData)) {
        const chatRef = ref(database, `chats/${chatId}`)
        const chatSnapshot = await get(chatRef)
        
        if (chatSnapshot.exists()) {
          const chatData = chatSnapshot.val()
          if (chatData.type === 'private' && 
              chatData.participants.length === 2 &&
              chatData.participants.includes(userId1) &&
              chatData.participants.includes(userId2)) {
            return { success: true, chatId }
          }
        }
      }
    }

    // Create new private chat
    return await createChat({
      type: 'private',
      participants: [userId1, userId2]
    })
  } catch (error: any) {
    console.error('Error starting private chat:', error)
    return { success: false, error: error.message }
  }
}

// Search messages in chat
export const searchMessages = async (
  chatId: string,
  searchTerm: string
): Promise<FiregramMessage[]> => {
  try {
    const messages = await getChatMessages(chatId)
    return messages.filter(message => 
      !message.isDeleted && 
      message.content.toLowerCase().includes(searchTerm.toLowerCase())
    )
  } catch (error) {
    console.error('Error searching messages:', error)
    return []
  }
}

// Add user to group chat
export const addUserToGroup = async (
  chatId: string,
  userId: string,
  adminId: string
): Promise<MessageResult> => {
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
      return { success: false, error: 'Only admins can add users' }
    }

    if (chatData.participants.includes(userId)) {
      return { success: false, error: 'User is already in the group' }
    }

    // Add user to participants
    const newParticipants = [...chatData.participants, userId]
    await set(ref(database, `chats/${chatId}/participants`), newParticipants)

    // Add chat to user's chat list
    await set(ref(database, `userChats/${userId}/${chatId}`), {
      chatId,
      joinedAt: Date.now(),
      lastRead: Date.now()
    })

    // Send system message
    await sendMessage(chatId, 'system', {
      content: `User joined the group`,
      type: 'text'
    })

    return { success: true }
  } catch (error: any) {
    console.error('Error adding user to group:', error)
    return { success: false, error: error.message }
  }
}

// Remove user from group chat
export const removeUserFromGroup = async (
  chatId: string,
  userId: string,
  adminId: string
): Promise<MessageResult> => {
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
      return { success: false, error: 'Only admins can remove users' }
    }

    // Remove user from participants
    const newParticipants = chatData.participants.filter(id => id !== userId)
    await set(ref(database, `chats/${chatId}/participants`), newParticipants)

    // Remove chat from user's chat list
    await remove(ref(database, `userChats/${userId}/${chatId}`))

    // Send system message
    await sendMessage(chatId, 'system', {
      content: `User was removed from the group`,
      type: 'text'
    })

    return { success: true }
  } catch (error: any) {
    console.error('Error removing user from group:', error)
    return { success: false, error: error.message }
  }
}
