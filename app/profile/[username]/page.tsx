"use client"

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AppLayout } from '@/components/layout/app-layout'
import { ProfileHeader } from '@/components/profile/profile-header'
import { ProfileTabs } from '@/components/profile/profile-tabs'
import { MysteryMartSection } from '@/components/profile/mystery-mart-section'
import { useAuth } from '@/components/auth/auth-provider'
import { FiregramUser } from '@/lib/types'
import { database } from '@/lib/firebase'
import { ref, onValue, off, set, remove } from 'firebase/database'
import { useToast } from '@/hooks/use-toast'
import { AlertTriangle } from 'lucide-react'

export default function ProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { userProfile } = useAuth()
  const { toast } = useToast()
  const username = params.username as string

  const [profileUser, setProfileUser] = useState<FiregramUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)

  const isOwnProfile = userProfile?.username === username

  useEffect(() => {
    if (username) {
      loadProfile()
    }
  }, [username])

  useEffect(() => {
    if (profileUser && userProfile && !isOwnProfile) {
      checkFollowStatus()
    }
  }, [profileUser, userProfile, isOwnProfile])

  const loadProfile = () => {
    setLoading(true)
    setError(null)

    // Query users by username
    const usersRef = ref(database, 'users')
    const unsubscribe = onValue(usersRef, (snapshot) => {
      if (snapshot.exists()) {
        const users = snapshot.val()
        const user = Object.keys(users)
          .map(key => ({ uid: key, ...users[key] }))
          .find(user => user.username === username)

        if (user) {
          setProfileUser(user)
        } else {
          setError('User not found')
        }
      } else {
        setError('User not found')
      }
      setLoading(false)
    }, (error) => {
      console.error('Error loading profile:', error)
      setError('Failed to load profile')
      setLoading(false)
    })

    return () => off(usersRef, 'value', unsubscribe)
  }

  const checkFollowStatus = async () => {
    if (!userProfile || !profileUser) return

    const followRef = ref(database, `follows/${userProfile.uid}/following/${profileUser.uid}`)
    onValue(followRef, (snapshot) => {
      setIsFollowing(snapshot.exists())
    }, { onlyOnce: true })
  }

  const handleFollow = async () => {
    if (!userProfile || !profileUser || followLoading) return

    setFollowLoading(true)
    try {
      const followRef = ref(database, `follows/${userProfile.uid}/following/${profileUser.uid}`)
      const followerRef = ref(database, `follows/${profileUser.uid}/followers/${userProfile.uid}`)
      
      await Promise.all([
        set(followRef, { createdAt: Date.now() }),
        set(followerRef, { createdAt: Date.now() })
      ])

      // Update user counts
      const userFollowingCountRef = ref(database, `users/${userProfile.uid}/followingCount`)
      const profileFollowersCountRef = ref(database, `users/${profileUser.uid}/followersCount`)
      
      await Promise.all([
        set(userFollowingCountRef, (userProfile.followingCount || 0) + 1),
        set(profileFollowersCountRef, (profileUser.followersCount || 0) + 1)
      ])

      setIsFollowing(true)
      
      // Update local state
      setProfileUser(prev => prev ? {
        ...prev,
        followersCount: (prev.followersCount || 0) + 1
      } : null)

      toast({
        title: "Success",
        description: `You are now following ${profileUser.username}`,
      })
    } catch (error) {
      console.error('Error following user:', error)
      toast({
        title: "Error",
        description: "Failed to follow user. Please try again.",
        variant: "destructive",
      })
    } finally {
      setFollowLoading(false)
    }
  }

  const handleUnfollow = async () => {
    if (!userProfile || !profileUser || followLoading) return

    setFollowLoading(true)
    try {
      const followRef = ref(database, `follows/${userProfile.uid}/following/${profileUser.uid}`)
      const followerRef = ref(database, `follows/${profileUser.uid}/followers/${userProfile.uid}`)
      
      await Promise.all([
        remove(followRef),
        remove(followerRef)
      ])

      // Update user counts
      const userFollowingCountRef = ref(database, `users/${userProfile.uid}/followingCount`)
      const profileFollowersCountRef = ref(database, `users/${profileUser.uid}/followersCount`)
      
      await Promise.all([
        set(userFollowingCountRef, Math.max(0, (userProfile.followingCount || 0) - 1)),
        set(profileFollowersCountRef, Math.max(0, (profileUser.followersCount || 0) - 1))
      ])

      setIsFollowing(false)
      
      // Update local state
      setProfileUser(prev => prev ? {
        ...prev,
        followersCount: Math.max(0, (prev.followersCount || 0) - 1)
      } : null)

      toast({
        title: "Success",
        description: `You unfollowed ${profileUser.username}`,
      })
    } catch (error) {
      console.error('Error unfollowing user:', error)
      toast({
        title: "Error",
        description: "Failed to unfollow user. Please try again.",
        variant: "destructive",
      })
    } finally {
      setFollowLoading(false)
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Profile Header Skeleton */}
          <Card className="bg-white">
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="w-32 h-32 bg-gray-200 rounded-full mx-auto md:mx-0"></div>
                  <div className="flex-1 space-y-4">
                    <div className="h-8 bg-gray-200 rounded w-48"></div>
                    <div className="flex gap-6">
                      <div className="text-center">
                        <div className="h-6 bg-gray-200 rounded w-12 mb-1"></div>
                        <div className="h-4 bg-gray-200 rounded w-12"></div>
                      </div>
                      <div className="text-center">
                        <div className="h-6 bg-gray-200 rounded w-12 mb-1"></div>
                        <div className="h-4 bg-gray-200 rounded w-16"></div>
                      </div>
                      <div className="text-center">
                        <div className="h-6 bg-gray-200 rounded w-12 mb-1"></div>
                        <div className="h-4 bg-gray-200 rounded w-16"></div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-32"></div>
                      <div className="h-4 bg-gray-200 rounded w-48"></div>
                      <div className="h-4 bg-gray-200 rounded w-40"></div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs Skeleton */}
          <div className="h-12 bg-gray-200 rounded"></div>
          
          {/* Content Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="bg-white">
                <CardContent className="p-4">
                  <div className="animate-pulse">
                    <div className="bg-gray-200 h-32 rounded-lg mb-3"></div>
                    <div className="bg-gray-200 h-4 rounded mb-2"></div>
                    <div className="bg-gray-200 h-3 rounded w-2/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </AppLayout>
    )
  }

  if (error || !profileUser) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto">
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error || 'Profile not found'}
            </AlertDescription>
          </Alert>
        </div>
      </AppLayout>
    )
  }

  // Check if profile is private and user is not following
  if (profileUser.isPrivate && !isOwnProfile && !isFollowing) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto space-y-6">
          <ProfileHeader
            user={profileUser}
            isOwnProfile={isOwnProfile}
            isFollowing={isFollowing}
            onFollow={handleFollow}
            onUnfollow={handleUnfollow}
          />
          
          <Card className="bg-white">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">This Account is Private</h3>
              <p className="text-gray-500 mb-6">
                Follow {profileUser.username} to see their posts and activity.
              </p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Profile Header */}
        <ProfileHeader
          user={profileUser}
          isOwnProfile={isOwnProfile}
          isFollowing={isFollowing}
          onFollow={handleFollow}
          onUnfollow={handleUnfollow}
        />

        {/* MysteryMart Section */}
        {profileUser.mysteryMartLinked && (
          <MysteryMartSection
            user={profileUser}
            isOwnProfile={isOwnProfile}
          />
        )}

        {/* Profile Tabs */}
        <ProfileTabs
          user={profileUser}
          isOwnProfile={isOwnProfile}
        />
      </div>
    </AppLayout>
  )
}
