"use client"

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { FiregramUser } from '@/lib/types'
import { MessageCircle, Settings, UserPlus, UserMinus, Shield, Star } from 'lucide-react'

interface ProfileHeaderProps {
  user: FiregramUser
  isOwnProfile: boolean
  isFollowing: boolean
  onFollow: () => void
  onUnfollow: () => void
}

export function ProfileHeader({
  user,
  isOwnProfile,
  isFollowing,
  onFollow,
  onUnfollow
}: ProfileHeaderProps) {
  const [loading, setLoading] = useState(false)

  const handleFollowAction = async () => {
    setLoading(true)
    try {
      if (isFollowing) {
        await onUnfollow()
      } else {
        await onFollow()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="bg-white">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Profile Picture */}
          <div className="flex-shrink-0 mx-auto md:mx-0">
            <Avatar className="w-32 h-32">
              <AvatarImage src={user.profilePicture} />
              <AvatarFallback className="bg-blue-800 text-white text-4xl">
                {user.fullName?.charAt(0)?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Profile Info */}
          <div className="flex-1 text-center md:text-left">
            {/* Username and Badges */}
            <div className="flex items-center justify-center md:justify-start gap-3 mb-4">
              <h1 className="text-2xl font-bold text-gray-900">{user.username}</h1>
              
              {user.isVerified && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  <Shield className="w-3 h-3 mr-1" />
                  Verified
                </Badge>
              )}
              
              {user.isAdvancedUser && (
                <Badge className="advanced-user-indicator">
                  <Star className="w-3 h-3 mr-1" />
                  Advanced
                </Badge>
              )}
              
              {user.mysteryMartLinked && (
                <Badge variant="outline" className="border-green-600 text-green-600">
                  Business
                </Badge>
              )}
            </div>

            {/* Stats */}
            <div className="flex justify-center md:justify-start gap-6 mb-4">
              <div className="text-center">
                <div className="text-xl font-bold text-gray-900">
                  {user.postsCount || 0}
                </div>
                <div className="text-sm text-gray-500">Posts</div>
              </div>
              
              <Link 
                href={`/profile/${user.username}/followers`}
                className="text-center hover:text-blue-800 transition-colors"
              >
                <div className="text-xl font-bold text-gray-900">
                  {user.followersCount || 0}
                </div>
                <div className="text-sm text-gray-500">Followers</div>
              </Link>
              
              <Link 
                href={`/profile/${user.username}/following`}
                className="text-center hover:text-blue-800 transition-colors"
              >
                <div className="text-xl font-bold text-gray-900">
                  {user.followingCount || 0}
                </div>
                <div className="text-sm text-gray-500">Following</div>
              </Link>
            </div>

            {/* Full Name and Bio */}
            <div className="space-y-2 mb-6">
              <p className="font-medium text-gray-900">{user.fullName}</p>
              {user.bio && (
                <p className="text-gray-600 whitespace-pre-wrap">{user.bio}</p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center md:justify-start gap-3">
              {isOwnProfile ? (
                <>
                  <Button asChild className="firegram-primary">
                    <Link href={`/profile/${user.username}/edit`}>
                      <Settings className="w-4 h-4 mr-2" />
                      Edit Profile
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/settings">
                      Settings
                    </Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    onClick={handleFollowAction}
                    disabled={loading}
                    className={isFollowing ? "bg-gray-600 hover:bg-gray-700" : "firegram-primary"}
                  >
                    {loading ? (
                      "Loading..."
                    ) : isFollowing ? (
                      <>
                        <UserMinus className="w-4 h-4 mr-2" />
                        Unfollow
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Follow
                      </>
                    )}
                  </Button>
                  
                  <Button asChild variant="outline">
                    <Link href={`/messages?user=${user.username}`}>
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Message
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
