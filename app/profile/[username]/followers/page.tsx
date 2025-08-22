"use client"

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AppLayout } from '@/components/layout/app-layout'
import { useAuth } from '@/components/auth/auth-provider'
import { FiregramUser } from '@/lib/types'
import { database } from '@/lib/firebase'
import { ref, get, set, remove } from 'firebase/database'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Users, UserPlus, UserMinus, AlertTriangle } from 'lucide-react'

export default function FollowersPage() {
  const params = useParams()
  const router = useRouter()
  const { userProfile } = useAuth()
  const { toast } = useToast()
  const username = params.username as string

  const [profileUser, setProfileUser] = useState<FiregramUser | null>(null)
  const [followersUsers, setFollowersUsers] = useState<FiregramUser[]>([])
  const [userFollowStatus, setUserFollowStatus] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({})

  const isOwnProfile = userProfile?.username === username

  useEffect(() => {
    loadData()
  }, [username])

  const loadData = async () => {
    setLoading(true)
    setError(null)

    try {
      // Load profile user
      const usersRef = ref(database, 'users')
      const usersSnapshot = await get(usersRef)
      
      if (!usersSnapshot.exists()) {
        setError('User not found')
        return
      }

      const users = usersSnapshot.val()
      const user = Object.keys(users)
        .map(key => ({ uid: key, ...users[key] }))
        .find(user => user.username === username)

      if (!user) {
        setError('User not found')
        return
      }

      setProfileUser(user)

      // Check if profile is private and user has access
      if (user.isPrivate && !isOwnProfile && userProfile) {
        const followRef = ref(database, `follows/${userProfile.uid}/following/${user.uid}`)
        const followSnapshot = await get(followRef)
        
        if (!followSnapshot.exists()) {
          setError('This account is private')
          return
        }
      }

      // Load followers list
      const followersRef = ref(database, `follows/${user.uid}/followers`)
      const followersSnapshot = await get(followersRef)
      
      if (!followersSnapshot.exists()) {
        setFollowersUsers([])
        setLoading(false)
        return
      }

      const followerIds = Object.keys(followersSnapshot.val())
      const followersUsersData: FiregramUser[] = []
      
      for (const userId of followerIds) {
        if (users[userId]) {
          followersUsersData.push({ uid: userId, ...users[userId] })
        }
      }

      setFollowersUsers(followersUsersData)

      // Check current user's follow status for each user
      if (userProfile && !isOwnProfile) {
        await checkFollowStatus(followersUsersData)
      }

    } catch (error) {
      console.error('Error loading followers:', error)
      setError('Failed to load followers list')
    } finally {
      setLoading(false)
    }
  }

  const checkFollowStatus = async (users: FiregramUser[]) => {
    if (!userProfile) return

    const status: Record<string, boolean> = {}
    
    for (const user of users) {
      if (user.uid !== userProfile.uid) {
        const followRef = ref(database, `follows/${userProfile.uid}/following/${user.uid}`)
        const followSnapshot = await get(followRef)
        status[user.uid] = followSnapshot.exists()
      }
    }
    
    setUserFollowStatus(status)
  }

  const handleFollow = async (targetUser: FiregramUser) => {
    if (!userProfile || actionLoading[targetUser.uid]) return

    setActionLoading(prev => ({ ...prev, [targetUser.uid]: true }))
    
    try {
      const followRef = ref(database, `follows/${userProfile.uid}/following/${targetUser.uid}`)
      const followerRef = ref(database, `follows/${targetUser.uid}/followers/${userProfile.uid}`)
      
      await Promise.all([
        set(followRef, { createdAt: Date.now() }),
        set(followerRef, { createdAt: Date.now() })
      ])

      // Update counts
      const userFollowingCountRef = ref(database, `users/${userProfile.uid}/followingCount`)
      const targetFollowersCountRef = ref(database, `users/${targetUser.uid}/followersCount`)
      
      await Promise.all([
        set(userFollowingCountRef, (userProfile.followingCount || 0) + 1),
        set(targetFollowersCountRef, (targetUser.followersCount || 0) + 1)
      ])

      setUserFollowStatus(prev => ({ ...prev, [targetUser.uid]: true }))

      toast({
        title: "Success",
        description: `You are now following ${targetUser.username}`,
      })
    } catch (error) {
      console.error('Error following user:', error)
      toast({
        title: "Error",
        description: "Failed to follow user. Please try again.",
        variant: "destructive",
      })
    } finally {
      setActionLoading(prev => ({ ...prev, [targetUser.uid]: false }))
    }
  }

  const handleUnfollow = async (targetUser: FiregramUser) => {
    if (!userProfile || actionLoading[targetUser.uid]) return

    setActionLoading(prev => ({ ...prev, [targetUser.uid]: true }))
    
    try {
      const followRef = ref(database, `follows/${userProfile.uid}/following/${targetUser.uid}`)
      const followerRef = ref(database, `follows/${targetUser.uid}/followers/${userProfile.uid}`)
      
      await Promise.all([
        remove(followRef),
        remove(followerRef)
      ])

      // Update counts
      const userFollowingCountRef = ref(database, `users/${userProfile.uid}/followingCount`)
      const targetFollowersCountRef = ref(database, `users/${targetUser.uid}/followersCount`)
      
      await Promise.all([
        set(userFollowingCountRef, Math.max(0, (userProfile.followingCount || 0) - 1)),
        set(targetFollowersCountRef, Math.max(0, (targetUser.followersCount || 0) - 1))
      ])

      setUserFollowStatus(prev => ({ ...prev, [targetUser.uid]: false }))

      toast({
        title: "Success",
        description: `You unfollowed ${targetUser.username}`,
      })
    } catch (error) {
      console.error('Error unfollowing user:', error)
      toast({
        title: "Error",
        description: "Failed to unfollow user. Please try again.",
        variant: "destructive",
      })
    } finally {
      setActionLoading(prev => ({ ...prev, [targetUser.uid]: false }))
    }
  }

  const handleRemoveFollower = async (targetUser: FiregramUser) => {
    if (!userProfile || !isOwnProfile || actionLoading[targetUser.uid]) return

    setActionLoading(prev => ({ ...prev, [targetUser.uid]: true }))
    
    try {
      const followRef = ref(database, `follows/${targetUser.uid}/following/${userProfile.uid}`)
      const followerRef = ref(database, `follows/${userProfile.uid}/followers/${targetUser.uid}`)
      
      await Promise.all([
        remove(followRef),
        remove(followerRef)
      ])

      // Update counts
      const targetFollowingCountRef = ref(database, `users/${targetUser.uid}/followingCount`)
      const userFollowersCountRef = ref(database, `users/${userProfile.uid}/followersCount`)
      
      await Promise.all([
        set(targetFollowingCountRef, Math.max(0, (targetUser.followingCount || 0) - 1)),
        set(userFollowersCountRef, Math.max(0, (userProfile.followersCount || 0) - 1))
      ])

      // Remove from local state
      setFollowersUsers(prev => prev.filter(user => user.uid !== targetUser.uid))

      toast({
        title: "Success",
        description: `Removed ${targetUser.username} from your followers`,
      })
    } catch (error) {
      console.error('Error removing follower:', error)
      toast({
        title: "Error",
        description: "Failed to remove follower. Please try again.",
        variant: "destructive",
      })
    } finally {
      setActionLoading(prev => ({ ...prev, [targetUser.uid]: false }))
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
            <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
          </div>
          
          <Card className="bg-white">
            <CardContent className="p-6">
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between animate-pulse">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-32"></div>
                        <div className="h-3 bg-gray-200 rounded w-24"></div>
                      </div>
                    </div>
                    <div className="w-20 h-8 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    )
  }

  if (error || !profileUser) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="h-10 w-10 p-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">Followers</h1>
          </div>

          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error || 'Failed to load followers list'}
            </AlertDescription>
          </Alert>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="h-10 w-10 p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Followers</h1>
            <p className="text-gray-600">
              {isOwnProfile ? 'People who follow you' : `People who follow ${profileUser.username}`}
            </p>
          </div>
        </div>

        {/* Followers List */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-800" />
              <span>{followersUsers.length} Followers</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {followersUsers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {isOwnProfile ? "No followers yet" : "No followers"}
                </h3>
                <p className="text-gray-500 mb-6">
                  {isOwnProfile 
                    ? "Share interesting posts to attract followers!" 
                    : `${profileUser.username} doesn't have any followers yet.`
                  }
                </p>
                {isOwnProfile && (
                  <Button asChild className="firegram-primary">
                    <Link href="/create">
                      <UserPlus className="w-4 h-4 mr-2" />
                      Create Post
                    </Link>
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {followersUsers.map(user => (
                  <div key={user.uid} className="flex items-center justify-between">
                    <Link 
                      href={`/profile/${user.username}`}
                      className="flex items-center space-x-4 flex-1 hover:bg-gray-50 p-2 rounded-lg transition-colors"
                    >
                      <div className="w-12 h-12 bg-blue-800 rounded-full flex items-center justify-center text-white font-medium">
                        {user.fullName?.charAt(0).toUpperCase() || user.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{user.fullName}</h3>
                        <p className="text-sm text-gray-500">@{user.username}</p>
                        {user.bio && (
                          <p className="text-sm text-gray-600 mt-1 line-clamp-1">{user.bio}</p>
                        )}
                      </div>
                      {user.isAdvancedUser && (
                        <div className="w-6 h-6 bg-gradient-to-r from-blue-800 to-green-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">A</span>
                        </div>
                      )}
                    </Link>
                    
                    {userProfile && user.uid !== userProfile.uid && (
                      <div className="ml-4 flex space-x-2">
                        {isOwnProfile ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveFollower(user)}
                            disabled={actionLoading[user.uid]}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            {actionLoading[user.uid] ? (
                              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <>
                                <UserMinus className="w-4 h-4 mr-1" />
                                Remove
                              </>
                            )}
                          </Button>
                        ) : userFollowStatus[user.uid] ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUnfollow(user)}
                            disabled={actionLoading[user.uid]}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            {actionLoading[user.uid] ? (
                              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <>
                                <UserMinus className="w-4 h-4 mr-1" />
                                Unfollow
                              </>
                            )}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleFollow(user)}
                            disabled={actionLoading[user.uid]}
                            className="firegram-primary"
                          >
                            {actionLoading[user.uid] ? (
                              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <>
                                <UserPlus className="w-4 h-4 mr-1" />
                                Follow
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
