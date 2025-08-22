import { NextRequest, NextResponse } from 'next/server'
import { database } from '@/lib/firebase'
import { ref, get, set, remove } from 'firebase/database'
import { verifyMysteryMartBusiness } from '@/lib/mysterymart'

export async function POST(request: NextRequest) {
  try {
    const { requestId, linkingCode, mysteryMartUid } = await request.json()

    if (!requestId || !linkingCode || !mysteryMartUid) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get the linking request from database
    const linkingRequestRef = ref(database, `linkingRequests/${requestId}`)
    const linkingRequestSnapshot = await get(linkingRequestRef)

    if (!linkingRequestSnapshot.exists()) {
      return NextResponse.json(
        { error: 'Linking request not found' },
        { status: 404 }
      )
    }

    const linkingRequest = linkingRequestSnapshot.val()

    // Check if request has expired
    if (Date.now() > linkingRequest.expiresAt) {
      await remove(linkingRequestRef)
      return NextResponse.json(
        { error: 'Linking request has expired' },
        { status: 400 }
      )
    }

    // Check if request is already completed
    if (linkingRequest.status === 'completed') {
      return NextResponse.json(
        { error: 'Linking request already completed' },
        { status: 400 }
      )
    }

    // Verify the linking code
    if (linkingRequest.code !== linkingCode) {
      return NextResponse.json(
        { error: 'Invalid linking code' },
        { status: 400 }
      )
    }

    // Get MysteryMart business data using the admin API
    const mysteryMartData = await verifyMysteryMartBusinessByUid(mysteryMartUid)

    if (!mysteryMartData.verified) {
      return NextResponse.json(
        { error: 'MysteryMart business not found or not verified' },
        { status: 404 }
      )
    }

    // Update Firegram user profile
    const firegramUserRef = ref(database, `users/${linkingRequest.firegramUid}`)
    const userSnapshot = await get(firegramUserRef)

    if (!userSnapshot.exists()) {
      return NextResponse.json(
        { error: 'Firegram user not found' },
        { status: 404 }
      )
    }

    const userData = userSnapshot.val()
    await set(firegramUserRef, {
      ...userData,
      mysteryMartLinked: true,
      mysteryMartData: mysteryMartData,
      mysteryMartLinkedAt: Date.now()
    })

    // Mark linking request as completed
    await set(linkingRequestRef, {
      ...linkingRequest,
      status: 'completed',
      completedAt: Date.now(),
      mysteryMartUid: mysteryMartUid
    })

    return NextResponse.json({
      success: true,
      message: 'Accounts linked successfully',
      firegramUid: linkingRequest.firegramUid,
      mysteryMartData: mysteryMartData
    })

  } catch (error) {
    console.error('Error completing linking:', error)
    return NextResponse.json(
      { error: 'Failed to complete linking' },
      { status: 500 }
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