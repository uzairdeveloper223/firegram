import { NextRequest, NextResponse } from 'next/server'
import admin from "firebase-admin"

const mysteryMartConfig = {
  projectId: "mystery-mart-by-uzair",
  clientEmail: "firebase-adminsdk-fbsvc@mystery-mart-by-uzair.iam.gserviceaccount.com",
  privateKey: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDGuhqigGnV+am+\nhmSX2PX8Wg8vCXFrHLZ8QkPQDgh9/k+sz8YyFnkAvswOyWimwWjvyw7WeWsW6w+v\n2o/v8WoX9mMsFJpjWlZvtNPz0ECzT48SfJ0mPDlr1Vjgn0Pw+ZLBqAB53MCfy5M3\nTZJnK5q+feHaWV+7oc1U0EhJKyPlKNW4cYfC3Gssxvc9KcGUPAzwz8/jJ12Hr4e/\nzJrAqM1AfunUJoA0VXWBcIvvCSrK9+24YnLV5UuZYfbke+jXESOvQkywQ5Bsd7GV\nmsvwMgVbwOX4IdTFBYbSaSX9bDm3FQBGxFa7d12WzbGHhIXTR9PaqNnD4RnOzStl\nXYmNpg/9AgMBAAECggEAHKVhB4GpP+3wOQWYZIci1lCJFcevsLf/2iOXMNuE/9xz\n0b5VnIy+vovCUHNaAYepv78ukV4JQNF7fmbsDrNnDrM2knkZ1C6GfS28y81+NhrG\nzexmnsdZo6CqYh6zJX5kWEQGZYqbva0TuIoXC4YulT0CHH57nUlylsI7WUi9sN+T\nifWaiZLYV5LZU2tlDVvAhEdDeuW/4lpaOoI9NQaFmW+BTPtWYrkNjkPgrxieAeEp\nK+JPZ0xEV6Y5Dw0dDtHGTuxnXCvGErIcAmSwZz06gFzb4WrcgnnmBJcYJ5+MblAz\nbRtNU6Q1SEz9Ua4K47EeVKXzaoD97wHel5PmWjoYRQKBgQD+GuKgRzZDHojxkv94\nEfb6SBBbPbckSoUnqvGTCfuRk/jcLqT95IBH+GyZp3YBTsa1zkUC0sjgVpYOzLRW\n5Vl58vuqi04ijAgpeP/OUsm+/qePuYtjXV1LSX0buXAgafBa4CnoUWyFB8jlI4xi\nJ0NNOfvhBZsZglTaXUvZ5HeS2wKBgQDINX708jjQ7CWpyxj1WPMoSHIRmMAB9IIF\n+4hqEvtQbrxyfn5o6zskZPZs9JdHOdLHUZ5PejfTS2YGI0PCgbJSNx8Wws3b1HQC\nzOPBfDHJZW+A8b5Asx2VPrIxDR5ExWqfIfhQ58rQalHncZ3+f/t5b90R4N4DHfJ1\n5ojr86LkBwKBgG0hOsc/DizRRlsJmLIGdR2UKYImBSuO3ZTls45EsUgaVrypQ67O\nndFK/ckXxHRXUrvt9HF7+U1vok6E18aiBUV8d10NKudnYHH/R01i/MYMNAZj11s7\nU7/rtdFcWK1zEgjVUOo3XfXcHAlctQPKfPsDtgs0DyJreOm3O8Y+eqQVAoGAeM2O\npU3iam2S7DjX/nKFhbDw4x0//e4C5ok3bom1inrGym7452XIcdVZu7R580g4nnvp\nAhvEw4GjNeDhaePILUOFRr6UaChxN59Zbc36XIMQHMXA/lkVaJBEBMTdlrFn/E0L\nAAZcohUFBpnPs1iV7FhLFBaS316ahflsdLK1ftECgYEA5hk2P7zflbbDcn/aiBF/\nq3+W70ETj5WFT8HiantjRLqxK45LdTgJfskWmTDg1bWwwi8Y1o7hvVa6x/3z3jDf\nu6chL8ALnnvHq6qjJrtHttzr9s6Oc7kRyjmXdONdQy3wUGaa8s5Bu3lNLT4NfgSY\nAf8iMvU94xZPouGZysy28wo=\n-----END PRIVATE KEY-----\n",
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(mysteryMartConfig),
    databaseURL: "https://mystery-mart-by-uzair-default-rtdb.firebaseio.com",
  })
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const email = searchParams.get('email')
  const todo = searchParams.get('todo')

  if (!email || !todo || todo !== "verify-biz") {
    return NextResponse.json({ verified: false })
  }

  try {
    // Get user from Firebase Auth
    const userRecord = await admin.auth().getUserByEmail(email)

    // Fetch user data from Realtime Database
    const userSnapshot = await admin.database().ref(`/users/${userRecord.uid}`).get()

    if (!userSnapshot.exists()) {
      return NextResponse.json({ verified: false })
    }

    const userData = userSnapshot.val()

    // Return detailed business information
    return NextResponse.json({
      verified: userData.isEmailVerified === true,
      businessName: userData.fullName || userRecord.displayName || "Unknown Business",
      businessType: userData.canSell ? (userData.isApprovedSeller ? "Approved Seller" : "Pending Seller") : "User",
      uid: userRecord.uid,
      username: userData.username,
      isApprovedSeller: userData.isApprovedSeller || false,
      canSell: userData.canSell || false,
      loyaltyTier: userData.loyaltyTier,
      rating: userData.rating || 0,
      stats: userData.stats || {},
      profilePicture: userData.profilePicture,
      bio: userData.bio,
      location: userData.location,
      socialLinks: userData.socialLinks || {},
      totalSales: userData.totalSales || 0,
      verificationStatus: userData.verificationStatus || "none"
    })

  } catch (error: any) {
    if (error.code === "auth/user-not-found") {
      return NextResponse.json({ verified: false })
    }
    console.error("Error verifying:", error)
    return NextResponse.json({ verified: false })
  }
}
