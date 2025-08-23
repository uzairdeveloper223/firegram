import { NextRequest, NextResponse } from 'next/server'
import { database } from '@/lib/firebase'
import { ref, get, set, remove } from 'firebase/database'
import admin from '@/lib/firebase-admin'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// Handle preflight requests
export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  })
}

export async function POST(request: NextRequest) {
  try {
    const { secureToken, requestId, mysteryMartUid, mysteryMartToken } = await request.json()

    if (!secureToken || !requestId || !mysteryMartUid || !mysteryMartToken) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Verify Mystery Mart user token
    let mysteryMartUser
    try {
      mysteryMartUser = await admin.auth().verifyIdToken(mysteryMartToken)
      if (mysteryMartUser.uid !== mysteryMartUid) {
        throw new Error('Token UID mismatch')
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid Mystery Mart authentication' },
        { status: 401, headers: corsHeaders }
      )
    }

    // Get the secure linking request from database
    const linkingRequestRef = ref(database, `secureLinks/${requestId}`)
    const linkingRequestSnapshot = await get(linkingRequestRef)

    if (!linkingRequestSnapshot.exists()) {
      return NextResponse.json(
        { error: 'Linking request not found or expired' },
        { status: 404, headers: corsHeaders }
      )
    }

    const linkingRequest = linkingRequestSnapshot.val()

    // Check if request has expired
    if (Date.now() > linkingRequest.expiresAt) {
      await remove(linkingRequestRef)
      return NextResponse.json(
        { error: 'Linking request has expired' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Check if request is already completed
    if (linkingRequest.status === 'completed') {
      return NextResponse.json(
        { error: 'Linking request already completed' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Verify the secure token
    if (linkingRequest.secureToken !== secureToken) {
      return NextResponse.json(
        { error: 'Invalid secure token' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Get MysteryMart business data using the internal API
    const mysteryMartData = await verifyMysteryMartBusinessByUid(mysteryMartUid)

    if (!mysteryMartData.verified) {
      return NextResponse.json(
        { error: 'MysteryMart business not found or not verified' },
        { status: 404, headers: corsHeaders }
      )
    }

    // Update Firegram user profile
    const firegramUserRef = ref(database, `users/${linkingRequest.firegramUid}`)
    const userSnapshot = await get(firegramUserRef)

    if (!userSnapshot.exists()) {
      return NextResponse.json(
        { error: 'Firegram user not found' },
        { status: 404, headers: corsHeaders }
      )
    }

    const userData = userSnapshot.val()
    await set(firegramUserRef, {
      ...userData,
      mysteryMartLinked: true,
      mysteryMartData: mysteryMartData,
      mysteryMartLinkedAt: Date.now()
    })

    // Mark linking request as completed and clean up
    await set(linkingRequestRef, {
      ...linkingRequest,
      status: 'completed',
      completedAt: Date.now(),
      mysteryMartUid: mysteryMartUid
    })

    // Schedule cleanup of the linking request after 24 hours
    setTimeout(async () => {
      try {
        await remove(linkingRequestRef)
      } catch (error) {
        console.error('Error cleaning up linking request:', error)
      }
    }, 24 * 60 * 60 * 1000)

    return NextResponse.json({
      success: true,
      message: 'Accounts linked successfully',
      firegramUid: linkingRequest.firegramUid,
      mysteryMartData: mysteryMartData,
      linkedAt: Date.now()
    }, { headers: corsHeaders })

  } catch (error) {
    console.error('Error completing automatic linking:', error)
    return NextResponse.json(
      { error: 'Failed to complete linking' },
      { status: 500, headers: corsHeaders }
    )
  }
}

// Helper function to get MysteryMart business data by UID
async function verifyMysteryMartBusinessByUid(uid: string) {
  try {
    const response = await fetch(`${process.env.MYSTERYMART_API_URL || 'https://mystery-mart-app.vercel.app'}/api/get-business-by-uid?uid=${uid}`)

    if (!response.ok) {
      throw new Error('Failed to fetch business data')
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error fetching MysteryMart business data:', error)
    return { verified: false }
  }
}