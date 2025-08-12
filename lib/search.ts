import { database } from './firebase'
import { ref, get, query, orderByChild, startAt, endAt } from 'firebase/database'
import { FiregramUser } from './types'

export async function searchUsers(searchQuery: string): Promise<FiregramUser[]> {
  if (!searchQuery || searchQuery.trim().length < 2) {
    return []
  }

  try {
    const cleanQuery = searchQuery.trim().toLowerCase()
    
    // Get all users and filter them
    const usersRef = ref(database, 'users')
    const snapshot = await get(usersRef)
    
    if (!snapshot.exists()) {
      return []
    }

    const users = snapshot.val()
    const results: FiregramUser[] = []

    // Search through all users
    Object.keys(users).forEach(uid => {
      const user = users[uid]
      if (user.username && user.username.toLowerCase().includes(cleanQuery)) {
        results.push({
          uid,
          ...user
        })
      } else if (user.fullName && user.fullName.toLowerCase().includes(cleanQuery)) {
        results.push({
          uid,
          ...user
        })
      }
    })

    return results.slice(0, 10) // Limit to 10 results
  } catch (error) {
    console.error('Error searching users:', error)
    return []
  }
}

export async function searchUsersByUsername(username: string): Promise<FiregramUser[]> {
  if (!username || username.trim().length < 2) {
    return []
  }

  try {
    const cleanUsername = username.trim().toLowerCase()
    
    // Get all users and filter by username
    const usersRef = ref(database, 'users')
    const snapshot = await get(usersRef)
    
    if (!snapshot.exists()) {
      return []
    }

    const users = snapshot.val()
    const results: FiregramUser[] = []

    Object.keys(users).forEach(uid => {
      const user = users[uid]
      if (user.username && user.username.toLowerCase().includes(cleanUsername)) {
        results.push({
          uid,
          ...user
        })
      }
    })

    return results.slice(0, 10)
  } catch (error) {
    console.error('Error searching users by username:', error)
    return []
  }
}
