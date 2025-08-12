"use client"

import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth'
import { ref, set, get, query, orderByChild, equalTo } from 'firebase/database'
import { auth, database } from './firebase'
import { FiregramUser, validateUsername } from './types'
import { verifyMysteryMartBusiness } from './mysterymart'

export interface AuthResult {
  success: boolean
  error?: string
  user?: FiregramUser
}

export interface RegistrationData {
  email: string
  password: string
  fullName: string
  username: string
  profilePicture?: string
}

// Check if username is available
export const checkUsernameAvailability = async (username: string): Promise<boolean> => {
  try {
    const usersRef = ref(database, 'users')
    const usernameQuery = query(usersRef, orderByChild('username'), equalTo(username))
    const snapshot = await get(usernameQuery)
    return !snapshot.exists()
  } catch (error) {
    console.error('Error checking username availability:', error)
    return false
  }
}

// Generate profile picture from name
const generateProfilePicture = (fullName: string): string => {
  const firstLetter = fullName.charAt(0).toUpperCase()
  // You can implement a more sophisticated avatar generation here
  return `data:image/svg+xml;base64,${btoa(`
    <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="#1e3a8a"/>
      <text x="50" y="60" font-family="Arial" font-size="40" fill="white" text-anchor="middle">${firstLetter}</text>
    </svg>
  `)}`
}

// Register new user
export const registerUser = async (data: RegistrationData): Promise<AuthResult> => {
  try {
    // Validate username
    const usernameValidation = validateUsername(data.username)
    if (!usernameValidation.valid) {
      return { success: false, error: usernameValidation.error }
    }

    // Check username availability
    const isAvailable = await checkUsernameAvailability(data.username)
    if (!isAvailable) {
      return { success: false, error: 'Username is already taken' }
    }

    // Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password)
    const { uid } = userCredential.user

    // Check MysteryMart integration
    const mysteryMartData = await verifyMysteryMartBusiness(data.email)

    // Create user profile in Realtime Database
    const userProfile: FiregramUser = {
      uid,
      username: data.username,
      fullName: data.fullName,
      email: data.email,
      profilePicture: data.profilePicture || generateProfilePicture(data.fullName),
      bio: '',
      isVerified: false,
      isAdvancedUser: false,
      createdAt: Date.now(),
      lastActive: Date.now(),
      isPrivate: false,
      hideOnlineStatus: false,
      allowMessages: 'everyone',
      followersCount: 0,
      followingCount: 0,
      postsCount: 0,
      mysteryMartLinked: mysteryMartData.verified,
      mysteryMartData: mysteryMartData.verified ? mysteryMartData : null
    }

    await set(ref(database, `users/${uid}`), userProfile)

    return { success: true, user: userProfile }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Sign in user
export const signInUser = async (email: string, password: string): Promise<AuthResult> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    const { uid } = userCredential.user

    // Get user profile
    const userRef = ref(database, `users/${uid}`)
    const snapshot = await get(userRef)
    
    if (!snapshot.exists()) {
      return { success: false, error: 'User profile not found' }
    }

    const userProfile = snapshot.val() as FiregramUser

    // Update last active
    await set(ref(database, `users/${uid}/lastActive`), Date.now())

    return { success: true, user: userProfile }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Sign out user
export const signOutUser = async (): Promise<AuthResult> => {
  try {
    await signOut(auth)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Get current user profile
export const getCurrentUserProfile = async (uid: string): Promise<FiregramUser | null> => {
  try {
    const userRef = ref(database, `users/${uid}`)
    const snapshot = await get(userRef)
    
    if (!snapshot.exists()) {
      return null
    }

    return snapshot.val() as FiregramUser
  } catch (error) {
    console.error('Error getting user profile:', error)
    return null
  }
}

// Auth state listener
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback)
}
