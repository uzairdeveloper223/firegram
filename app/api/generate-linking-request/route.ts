import { NextRequest, NextResponse } from 'next/server'
import { ref, set, getDatabase } from 'firebase/database'
import { initializeApp } from 'firebase/app'
import admin from '@/lib/firebase-admin'

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


// Generate a simple 6-character code (letters and numbers)
function generateSimpleCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// Generate a unique request ID
function generateRequestId(): string {
  return 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
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

    const firegramUid = userId

    // Generate unique request ID and linking code
    const requestId = generateRequestId()
    const linkingCode = generateSimpleCode()

    // Create linking request data
    const linkingRequest = {
      id: requestId,
      firegramUid,
      code: linkingCode,
      status: 'pending',
      createdAt: Date.now(),
      expiresAt: Date.now() + (15 * 60 * 1000), // 15 minutes
    }

    // Store in Firebase Realtime Database
    const linkingRequestsRef = ref(database, `linkingRequests/${requestId}`)
    await set(linkingRequestsRef, linkingRequest)

    // Generate direct link to MysteryMart
    const directLink = `https://mystery-mart-app.vercel.app/link-firegram?requestId=${requestId}`

    return NextResponse.json({
      success: true,
      requestId,
      linkingCode,
      directLink,
      expiresAt: linkingRequest.expiresAt
    })

  } catch (error) {
    console.error('Error generating linking request:', error)
    return NextResponse.json(
      { error: 'Failed to generate linking request' },
      { status: 500 }
    )
  }
}