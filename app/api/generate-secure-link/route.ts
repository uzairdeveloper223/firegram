import { NextRequest, NextResponse } from 'next/server'
import { ref, set, getDatabase } from 'firebase/database'
import { initializeApp } from 'firebase/app'
import admin from '@/lib/firebase-admin'
import { randomBytes } from 'crypto'

// Firebase config for client-side operations
const firebaseConfig = {
  apiKey: "AIzaSyCyxjEz8m5XgcyKQT_MenE2nF3ee5f6njE",
  authDomain: "firegram-by-uzair.firebaseapp.com",
  databaseURL: "https://firegram-by-uzair-default-rtdb.firebaseio.com",
  projectId: "firegram-by-uzair",
  storageBucket: "firegram-by-uzair.firebasestorage.app",
  messagingSenderId: "372370171931",
  appId: "1:372370171931:web:70865a6e1de4ecf80870be"
}

const app = initializeApp(firebaseConfig)
const database = getDatabase(app)

// Generate a secure token for linking
function generateSecureToken(): string {
  return randomBytes(32).toString('hex')
}

// Generate a unique request ID
function generateRequestId(): string {
  return 'link_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
}

export async function POST(request: NextRequest) {
  try {
    // Get the authorization token from headers
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix

    // Verify the Firebase ID token
    let decodedToken
    try {
      decodedToken = await admin.auth().verifyIdToken(token)
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const userId = decodedToken.uid

    // Generate unique request ID and secure token
    const requestId = generateRequestId()
    const secureToken = generateSecureToken()

    // Create linking request data
    const linkingRequest = {
      id: requestId,
      firegramUid: userId,
      secureToken,
      status: 'pending',
      createdAt: Date.now(),
      expiresAt: Date.now() + (30 * 60 * 1000), // 30 minutes (longer expiry)
      userAgent: request.headers.get('user-agent') || '',
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    }

    // Store in Firebase Realtime Database
    const linkingRequestsRef = ref(database, `secureLinks/${requestId}`)
    await set(linkingRequestsRef, linkingRequest)

    // Generate direct secure link to MysteryMart
    const secureLink = `https://mystery-mart-app.vercel.app/link-firegram/auto?token=${secureToken}&requestId=${requestId}`

    return NextResponse.json({
      success: true,
      requestId,
      secureLink,
      expiresAt: linkingRequest.expiresAt,
      expiresIn: 30 * 60 // 30 minutes in seconds
    })

  } catch (error) {
    console.error('Error generating secure link:', error)
    return NextResponse.json(
      { error: 'Failed to generate secure link' },
      { status: 500 }
    )
  }
}