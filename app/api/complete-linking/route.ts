import { NextRequest, NextResponse } from 'next/server'
import { database } from '@/lib/firebase'
import { ref, get, set, remove } from 'firebase/database'
import { verifyMysteryMartBusiness } from '@/lib/mysterymart'

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
    // Get the authorization token from headers
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: corsHeaders }
      )
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix

    // Verify the Firebase ID token
    let decodedToken
    try {
      const admin = await import('firebase-admin')
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: "firegram-by-uzair",
            clientEmail: "firebase-adminsdk-fbsvc@firegram-by-uzair.iam.gserviceaccount.com",
            privateKey: "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCQLy1Pqv7AoYFg\nufArSeOK0sTpAs517BuO/ol0ZCQT/0p5ibiy9LPvV6ivJ2r7ZinYofNV4QsfH5y/\nnflQpJc8Iva3zwhgJRaMw7z7GVFqwljGwcHoAl2t1PyLtQTLRsS/2Peq+SjjN3Ms\nvXPmIf2a5AJ3Q8YBI4NkgDWmi6x39Xm4bp8jhL5vWu41NsRPYjb6u9XBxVxLCRpw\n2XjVAIjjU80+OQGsZ+xm0Vwyan8bGZYIoduIDJwf57uazTdWemt3X/F7ABoW6O/2\nceQkSg6goeBQAtcNX5uZZMS7/9qlBMqNEOGAZld/xEMIwKkwkPcE6TgFmqqk6xHU\nFfZyqdYzAgMBAAECggEANDiqEB9OKoW0XsyphHw8CiVBhWVrUsGDz7w4G6xDduyx\nVCjB+Srw2sCki1/a+xfrExfBEvsxtIGWG77DNGaQkgrV0ggNsAjuzGf+k/F9EA44\n6i/2I6prtJCeMZmMFXXZv+R8+3NH0FfegrdReWoZONbZX8nvtqzeo3FePSZ8fmui\nkUd94f862/LmIpDCYjRcgL/mm6J80ej8KP44EiPgbt4om3mvTG4Wa6QCy33sjwPu\nxwaPA4MmufCejPJYIboNO6Li1a0X7ZybB3cR/KGjvO5nnfvRJYMiHpFyRG6hA67x\n3SyV9DUXw+UV7Qj7hCPn9yfKT3QAA2j8aFMnp5yskQKBgQDAfV+htpfNPam6Lw+O\nxPrt3e12gMF98vg9Hs7IVmIIBWVK2HlsWXMtghTjyW3qM6V0zp0jeqy4Dc/L0NwB\n/Mf2Qim9lFtKgnNwfQO5RoWlEIqu7x7RYk0if9ywU/W6Tjbul69bVsbiqED7PeQ8\nVwKYVjhiQqUQPql0s6Hy60y5gwKBgQC/wbAjikJ/EIJV9EtRcSiJKJQ/WI7S7ztM\nM7yrY68Z0BfrP6AX4w/ksVc1v1yqVbAhIUjdMf5Xupcm9CwdmzQkuOFMKq1FR9jI\nqqAaVgI6etZJquzzZnGV0XcHwF11MrZaRaZBiLK+7hkvJbBFQajxce+HbquwHbzJ\nZsxVP/PBkQKBgQCsOUCwQtvNcceDYwnrdokA/Jizd34n/5VlskPXcZqijJlVfxwc\n+meYJxQjvpzOeEkomph0HxWcVBdAx+2hBZev2QDZs3x+zPsWgXQseFGpH4TGAgKz\n2t0i6f398hEhEUwK68Kk2Z53O41wfa7Q4hTbUgF+wRxIzZf2Z6aV3zu1mwKBgQC7\nMfAroctsk8dI9eWZKeiyjSS7+k3jaZvvtgoXHodPoa/X/hLhfs6DKQTD+X4S4vfA\nP+gL18Q+DG+GnZN7i4oJ11pJqtff7FWa/8awLwqZ4FTVMcGDk5yK7yNOM+KIiOsv\nkRLOow4sCfAX8Kj10zWEDwAQrF963GzyCCKtjnL9oQKBgEHyyfB/OslrPbU6gl65\nRfMf/3G0oZbLTC5juN7rfGTvERbt7eUP+RwPH1k4MwogEFhTLqWd6twql4b6Mqok\nyBzuuHy/+11TG/3qLyI+xBWKy3INVPVOpyFlkO5QulkQs6i6Cb76ZmxGEPHYFhXh\ns1TcpfGihxWT9skw//xYCoEd\n-----END PRIVATE KEY-----\n"
          }),
          databaseURL: "https://firegram-by-uzair-default-rtdb.firebaseio.com"
        })
      }
      decodedToken = await admin.auth().verifyIdToken(token)
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401, headers: corsHeaders }
      )
    }

    const { requestId, linkingCode, mysteryMartUid } = await request.json()

    if (!requestId || !linkingCode || !mysteryMartUid) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Get the linking request from database
    const linkingRequestRef = ref(database, `linkingRequests/${requestId}`)
    const linkingRequestSnapshot = await get(linkingRequestRef)

    if (!linkingRequestSnapshot.exists()) {
      return NextResponse.json(
        { error: 'Linking request not found' },
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

    // Verify the linking code
    if (linkingRequest.code !== linkingCode) {
      return NextResponse.json(
        { error: 'Invalid linking code' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Get MysteryMart business data using the admin API
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
    }, { headers: corsHeaders })

  } catch (error) {
    console.error('Error completing linking:', error)
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