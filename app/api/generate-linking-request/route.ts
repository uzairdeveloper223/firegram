import { NextRequest, NextResponse } from 'next/server'
import { auth, database } from '@/lib/firebase'
import { ref, set } from 'firebase/database'
import { getAuth } from 'firebase/auth'

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
    // Get the current user from Firebase Auth
    const authInstance = getAuth()
    const user = authInstance.currentUser

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const firegramUid = user.uid

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