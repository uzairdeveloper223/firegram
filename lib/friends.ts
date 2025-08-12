"use client"

import { ref, push, set, get, query, orderByChild, equalTo, remove } from 'firebase/database'
import { database } from './firebase'
import { UserFriend } from './types'

// Check if two users are friends (mutual followers)
export const areUsersFriends = async (userId1: string, userId2: string): Promise<boolean> => {
  try {
    // Check if userId1 follows userId2
    const follow1Ref = ref(database, `follows/${userId1}/${userId2}`)
    const follow1Snapshot = await get(follow1Ref)

    // Check if userId2 follows userId1
    const follow2Ref = ref(database, `follows/${userId2}/${userId1}`)
    const follow2Snapshot = await get(follow2Ref)

    return follow1Snapshot.exists() && follow2Snapshot.exists()
  } catch (error) {
    console.error('Error checking friendship:', error)
    return false
  }
}

// Get user's friends list
export const getUserFriends = async (userId: string): Promise<string[]> => {
  try {
    const friendsRef = ref(database, 'friends')
    const snapshot = await get(friendsRef)

    if (!snapshot.exists()) {
      return []
    }

    const friendsData = snapshot.val()
    const friends: string[] = []

    for (const friendshipId of Object.keys(friendsData)) {
      const friendship = friendsData[friendshipId] as UserFriend
      
      if (friendship.userId1 === userId) {
        friends.push(friendship.userId2)
      } else if (friendship.userId2 === userId) {
        friends.push(friendship.userId1)
      }
    }

    return friends
  } catch (error) {
    console.error('Error fetching friends:', error)
    return []
  }
}

// Create friendship when mutual follow is detected
export const createFriendship = async (userId1: string, userId2: string): Promise<void> => {
  try {
    // Check if friendship already exists
    const existingFriend = await getFriendshipId(userId1, userId2)
    if (existingFriend) return

    // Check if they are mutual followers
    const areFriends = await areUsersFriends(userId1, userId2)
    if (!areFriends) return

    const friendship: Omit<UserFriend, 'id'> = {
      userId1: userId1 < userId2 ? userId1 : userId2, // Ensure consistent ordering
      userId2: userId1 < userId2 ? userId2 : userId1,
      createdAt: Date.now()
    }

    const friendsRef = ref(database, 'friends')
    const newFriendshipRef = push(friendsRef)
    await set(newFriendshipRef, friendship)
  } catch (error) {
    console.error('Error creating friendship:', error)
  }
}

// Remove friendship when users unfollow each other
export const removeFriendship = async (userId1: string, userId2: string): Promise<void> => {
  try {
    const friendshipId = await getFriendshipId(userId1, userId2)
    if (!friendshipId) return

    await remove(ref(database, `friends/${friendshipId}`))
  } catch (error) {
    console.error('Error removing friendship:', error)
  }
}

// Helper function to get friendship ID
const getFriendshipId = async (userId1: string, userId2: string): Promise<string | null> => {
  try {
    const friendsRef = ref(database, 'friends')
    const snapshot = await get(friendsRef)

    if (!snapshot.exists()) {
      return null
    }

    const friendsData = snapshot.val()
    
    for (const friendshipId of Object.keys(friendsData)) {
      const friendship = friendsData[friendshipId] as UserFriend
      
      if ((friendship.userId1 === userId1 && friendship.userId2 === userId2) ||
          (friendship.userId1 === userId2 && friendship.userId2 === userId1)) {
        return friendshipId
      }
    }

    return null
  } catch (error) {
    console.error('Error getting friendship ID:', error)
    return null
  }
}

// Get mutual friends between two users
export const getMutualFriends = async (userId1: string, userId2: string): Promise<string[]> => {
  try {
    const user1Friends = await getUserFriends(userId1)
    const user2Friends = await getUserFriends(userId2)

    return user1Friends.filter(friend => user2Friends.includes(friend))
  } catch (error) {
    console.error('Error getting mutual friends:', error)
    return []
  }
}

// Get user's chats with friends only
export const getFriendChats = async (userId: string): Promise<string[]> => {
  try {
    const friends = await getUserFriends(userId)
    const userChatsRef = ref(database, `userChats/${userId}`)
    const snapshot = await get(userChatsRef)

    if (!snapshot.exists()) {
      return []
    }

    const userChatsData = snapshot.val()
    const friendChatIds: string[] = []

    for (const chatId of Object.keys(userChatsData)) {
      const chatRef = ref(database, `chats/${chatId}`)
      const chatSnapshot = await get(chatRef)
      
      if (chatSnapshot.exists()) {
        const chatData = chatSnapshot.val()
        
        // Check if it's a private chat with a friend
        if (chatData.type === 'private' && chatData.participants.length === 2) {
          const otherUser = chatData.participants.find((id: string) => id !== userId)
          if (otherUser && friends.includes(otherUser)) {
            friendChatIds.push(chatId)
          }
        }
      }
    }

    return friendChatIds
  } catch (error) {
    console.error('Error getting friend chats:', error)
    return []
  }
}
