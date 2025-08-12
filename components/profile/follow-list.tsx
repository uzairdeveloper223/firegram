"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { FiregramUser } from '@/lib/types'
import { database } from '@/lib/firebase'
import { ref, onValue, get } from 'firebase/database'
import { useAuth } from '@/components/auth/auth-provider'
import { Shield, Star, UserPlus, UserMinus } from 'lucide-react'

interface FollowListProps {
  userId: string
  type: 'followers' | 'following'
  isOwnProfile: boolean
}

interface FollowItem {
  userId: string
  user: FiregramUser
  followDate: number
  isFollowingBack?: boolean
}

export function FollowList({ userId, type, isOwnProfile }: FollowListProps) {
  const { userProfile } = useAuth()
  const [follows, setFollows] = useState<FollowItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadFollows()
  }, [userId, type])

  const loadFollows = async () => {
    setLoading(true)
    setError(null)

    try {
      const followsRef = ref(database, `follows/${userId}/${type}`)
      const snapshot = await get(followsRef)

      if (snapshot.exists()) {
        const followsData = snapshot.val()
        const followUserIds = Object.keys(followsData)

        // Load user details for each follow
        const followItems: FollowItem[] = []
        
        for (const followUserId of followUserIds) {
          const userRef = ref(database, `users/${followUserId}`)
          const userSnapshot = await get(userRef)
          
          if (userSnapshot.exists()) {
            const userData = userSnapshot.val()
            followItems.push({
              userId: followUserId,
              user: { uid: followUserId, ...userData },
              followDate: followsData[followUserId].createdAt || Date.now()
            })
          }
        }

        // Sort by follow date (newest first)
        followItems.sort((a, b) => b.followDate - a.followDate)
        setFollows(followItems)
      } else {
        setFollows([])
      }
    } catch (error) {
      console.error(`Error loading ${type}:`, error)
      setError(`Failed to load ${type}`)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="bg-white">
            <CardContent className="p-4">
              <div className="animate-pulse flex items-center space-x-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="bg-gray-200 h-4 rounded w-32"></div>
                  <div className="bg-gray-200 h-3 rounded w-24"></div>
                </div>
                <div className="bg-gray-200 h-8 w-20 rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card className="bg-white">
        <CardContent className="p-8 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={loadFollows}>Try Again</Button>
        </CardContent>
      </Card>
    )
  }

  if (follows.length === 0) {
    return (
      <Card className="bg-white">
        <CardContent className="p-12 text-center">
          <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
            <UserPlus className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No {type} yet
          </h3>
          <p className="text-gray-500">
            {type === 'followers' 
              ? isOwnProfile 
                ? "When people follow you, they'll appear here." 
                : "This user doesn't have any followers yet."
              : isOwnProfile
                ? "Start following people to see them here."
                : "This user isn't following anyone yet."
            }
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {follows.map((followItem) => (
        <FollowItem
          key={followItem.userId}
          user={followItem.user}
          followDate={followItem.followDate}
          isOwnProfile={isOwnProfile}
          currentUserId={userProfile?.uid}
        />
      ))}
    </div>
  )
}

interface FollowItemProps {
  user: FiregramUser
  followDate: number
  isOwnProfile: boolean
  currentUserId?: string
}

function FollowItem({ user, followDate, isOwnProfile, currentUserId }: FollowItemProps) {
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (currentUserId && currentUserId !== user.uid) {
      checkFollowStatus()
    }
  }, [currentUserId, user.uid])

  const checkFollowStatus = async () => {
    if (!currentUserId) return

    try {
      const followRef = ref(database, `follows/${currentUserId}/following/${user.uid}`)
      const snapshot = await get(followRef)
      setIsFollowing(snapshot.exists())
    } catch (error) {
      console.error('Error checking follow status:', error)
    }
  }

  const handleFollowToggle = async () => {
    if (!currentUserId || loading) return

    setLoading(true)
    try {
      // Implementation for follow/unfollow
      // This would be similar to the ProfileHeader implementation
      console.log('Follow toggle for:', user.username)
    } catch (error) {
      console.error('Error toggling follow:', error)
    } finally {
      setLoading(false)
    }
  }

  const isCurrentUser = currentUserId === user.uid

  return (
    <Card className="bg-white hover:bg-gray-50 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-center space-x-4">
          {/* Profile Picture */}
          <Link href={`/profile/${user.username}`}>
            <Avatar className="w-12 h-12 cursor-pointer">
              <AvatarImage src={user.profilePicture} />
              <AvatarFallback className="bg-blue-800 text-white">
                {user.fullName?.charAt(0)?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>

          {/* User Info */}
          <div className="flex-1">
            <Link href={`/profile/${user.username}`} className="block">
              <div className="flex items-center space-x-2 mb-1">
                <p className="font-medium text-gray-900 hover:text-blue-800 transition-colors">
                  {user.username}
                </p>
                
                {user.isVerified && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    <Shield className="w-3 h-3" />
                  </Badge>
                )}
                
                {user.isAdvancedUser && (
                  <Badge className="advanced-user-indicator">
                    <Star className="w-3 h-3" />
                  </Badge>
                )}
              </div>
              
              <p className="text-sm text-gray-500">{user.fullName}</p>
              
              {user.bio && (
                <p className="text-sm text-gray-600 line-clamp-1 mt-1">
                  {user.bio}
                </p>
              )}
            </Link>
          </div>

          {/* Action Button */}
          <div className="flex flex-col items-end space-y-1">
            {!isCurrentUser && (
              <Button
                onClick={handleFollowToggle}
                disabled={loading}
                size="sm"
                className={
                  isFollowing 
                    ? "bg-gray-600 hover:bg-gray-700" 
                    : "firegram-primary"
                }
              >
                {loading ? (
                  "..."
                ) : isFollowing ? (
                  <>
                    <UserMinus className="w-3 h-3 mr-1" />
                    Unfollow
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3 h-3 mr-1" />
                    Follow
                  </>
                )}
              </Button>
            )}
            
            <p className="text-xs text-gray-500">
              {new Date(followDate).toLocaleDateString()}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
