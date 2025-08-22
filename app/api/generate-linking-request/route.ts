import { NextRequest, NextResponse } from 'next/server'
import { ref, set, getDatabase } from 'firebase/database'
import { initializeApp } from 'firebase/app'
import admin from 'firebase-admin'

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

// Initialize Firebase Admin if not already initialized
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