'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CheckCircle, XCircle, User, Store, ArrowRight, ExternalLink } from 'lucide-react'
import { auth, database } from '@/lib/firebase'
import { ref, get } from 'firebase/database'
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth'
import { FiregramUser } from '@/lib/types'

export default function LinkingCompletePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const success = searchParams.get('success') === 'true'
  const mysteryMartUid = searchParams.get('mysteryMartUid')

  const [user, setUser] = useState<FirebaseUser | null>(null)
  const [firegramUser, setFiregramUser] = useState<FiregramUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [mysteryMartData, setMysteryMartData] = useState<any>(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      if (currentUser) {
        loadFiregramUserData(currentUser.uid)
      } else {
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [])

  const loadFiregramUserData = async (uid: string) => {
    try {
      const userRef = ref(database, `users/${uid}`)
      const snapshot = await get(userRef)

      if (snapshot.exists()) {
        const userData = snapshot.val() as FiregramUser
        setFiregramUser(userData)
        
        if (userData.mysteryMartData) {
          setMysteryMartData(userData.mysteryMartData)
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading your profile...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">Authentication Required</CardTitle>
            <CardDescription>
              Please log in to view your linking status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => router.push('/auth/login')}
              className="w-full"
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">Linking Failed</CardTitle>
            <CardDescription>
              There was an issue linking your accounts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-red-200 bg-red-50">
              <XCircle className="w-4 h-4 text-red-600" />
              <AlertDescription className="text-red-800">
                The linking process was not completed successfully. Please try again.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <Button
                onClick={() => router.push(`/profile/${firegramUser?.username}/edit`)}
                className="w-full"
              >
                Try Again
              </Button>
              <Button
                onClick={() => router.push(`/profile/${firegramUser?.username}`)}
                variant="outline"
                className="w-full"
              >
                Go to Profile
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Check if already linked
  const isAlreadyLinked = firegramUser?.mysteryMartLinked && mysteryMartData

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-green-50 to-blue-50">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center text-green-600 text-2xl">
            <CheckCircle className="w-8 h-8 mr-3" />
            {isAlreadyLinked ? 'Already Linked!' : 'Successfully Linked!'}
          </CardTitle>
          <CardDescription className="text-lg">
            {isAlreadyLinked 
              ? 'Your MysteryMart business is already connected to your Firegram profile'
              : 'Your MysteryMart business has been successfully connected to your Firegram profile'
            }
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>Great news!</strong> Your business profile is now visible on Firegram and you can showcase your MysteryMart store to your followers.
            </AlertDescription>
          </Alert>

          {mysteryMartData && (
            <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
              <h4 className="font-semibold text-gray-900 flex items-center">
                <Store className="w-5 h-5 mr-2 text-purple-600" />
                Linked Business Information
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Business Name:</span>
                  <span className="font-medium">{mysteryMartData.businessName}</span>
                </div>
                {mysteryMartData.username && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Username:</span>
                    <span className="font-medium">@{mysteryMartData.username}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className={`font-medium ${mysteryMartData.isApprovedSeller ? 'text-green-600' : 'text-yellow-600'}`}>
                    {mysteryMartData.isApprovedSeller ? 'Approved Seller' : 'Pending Approval'}
                  </span>
                </div>
                {mysteryMartData.rating && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Rating:</span>
                    <span className="font-medium">{mysteryMartData.rating.toFixed(1)} ⭐</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <Button
              onClick={() => router.push(`/profile/${firegramUser?.username}`)}
              className="w-full firegram-primary"
              size="lg"
            >
              <User className="w-5 h-5 mr-2" />
              View My Profile
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>

            {mysteryMartData?.username && (
              <Button
                asChild
                variant="outline"
                className="w-full"
                size="lg"
              >
                <a 
                  href={`https://mystery-mart-app.vercel.app/seller/${mysteryMartData.username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Store className="w-5 h-5 mr-2" />
                  Visit My MysteryMart Store
                  <ExternalLink className="w-4 h-4 ml-2" />
                </a>
              </Button>
            )}

            <Button
              onClick={() => router.push('/')}
              variant="outline"
              className="w-full"
            >
              Go to Home Feed
            </Button>
          </div>

          <div className="text-center text-sm text-gray-500">
            <p>🎉 You can now showcase your business to your Firegram followers!</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}