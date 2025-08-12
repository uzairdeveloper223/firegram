"use client"

import { useState, useEffect } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FiregramNotification, FiregramUser } from '@/lib/types'
import { getCurrentUserProfile } from '@/lib/auth'
import { 
  Heart, 
  MessageCircle, 
  UserPlus, 
  AtSign, 
  Mail, 
  Shield,
  Clock,
  ExternalLink
} from 'lucide-react'
import Link from 'next/link'

interface NotificationsListProps {
  notifications: FiregramNotification[]
  loading: boolean
  onMarkAsRead: (notificationId: string) => void
  currentUserId: string
}

export function NotificationsList({ notifications, loading, onMarkAsRead, currentUserId }: NotificationsListProps) {
  const [profiles, setProfiles] = useState<Record<string, FiregramUser>>({})

  useEffect(() => {
    loadProfiles()
  }, [notifications])

  const loadProfiles = async () => {
    const userIds = [...new Set(notifications.map(n => n.fromUserId))]
    const profilePromises = userIds.map(async (userId) => {
      const profile = await getCurrentUserProfile(userId)
      return { userId, profile }
    })

    const profileResults = await Promise.all(profilePromises)
    const profilesMap: Record<string, FiregramUser> = {}
    
    profileResults.forEach(({ userId, profile }) => {
      if (profile) {
        profilesMap[userId] = profile
      }
    })

    setProfiles(profilesMap)
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="w-4 h-4 text-red-500" />
      case 'comment':
        return <MessageCircle className="w-4 h-4 text-green-500" />
      case 'follow':
        return <UserPlus className="w-4 h-4 text-purple-500" />
      case 'mention':
        return <AtSign className="w-4 h-4 text-yellow-500" />
      case 'message':
        return <Mail className="w-4 h-4 text-blue-500" />
      case 'admin':
        return <Shield className="w-4 h-4 text-orange-500" />
      default:
        return <Clock className="w-4 h-4 text-gray-500" />
    }
  }

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) {
      return `${days}d ago`
    } else if (hours > 0) {
      return `${hours}h ago`
    } else if (minutes > 0) {
      return `${minutes}m ago`
    } else {
      return 'Just now'
    }
  }

  const getNotificationLink = (notification: FiregramNotification) => {
    switch (notification.type) {
      case 'like':
      case 'comment':
      case 'mention':
        return notification.postId ? `/post/${notification.postId}` : '#'
      case 'follow':
        const profile = profiles[notification.fromUserId]
        return profile ? `/profile/${profile.username}` : '#'
      case 'message':
        return notification.chatId ? `/messages?chat=${notification.chatId}` : '/messages'
      case 'admin':
        return '/notifications'
      default:
        return '#'
    }
  }

  const handleNotificationClick = (notification: FiregramNotification) => {
    if (!notification.isRead) {
      onMarkAsRead(notification.id)
    }
  }

  if (loading) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center space-x-3 animate-pulse">
            <div className="w-10 h-10 bg-gray-200 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (notifications.length === 0) {
    return (
      <div className="text-center py-12">
        <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications</h3>
        <p className="text-gray-500">You're all caught up!</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-gray-100">
      {notifications.map((notification) => {
        const profile = profiles[notification.fromUserId]
        const link = getNotificationLink(notification)
        
        return (
          <div
            key={notification.id}
            className={`p-4 hover:bg-gray-50 transition-colors ${
              !notification.isRead ? 'bg-blue-50 border-l-4 border-blue-500' : ''
            }`}
          >
            <div className="flex items-start space-x-3">
              {/* Avatar */}
              <Avatar className="w-10 h-10">
                <AvatarImage src={profile?.profilePicture} />
                <AvatarFallback className="bg-gray-200">
                  {notification.type === 'admin' ? (
                    <Shield className="w-5 h-5 text-orange-500" />
                  ) : (
                    profile?.fullName?.[0]?.toUpperCase()
                  )}
                </AvatarFallback>
              </Avatar>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  {getNotificationIcon(notification.type)}
                  
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">
                      {notification.type === 'admin' ? (
                        <span className="font-medium text-orange-600">Admin</span>
                      ) : (
                        <span className="font-medium">
                        {profile?.fullName || 'Unknown User'}
                        </span>
                      )}
                      {' '}
                      <span className="text-gray-600">{notification.content}</span>
                    </p>
                    
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs text-gray-500">
                        {formatTimeAgo(notification.createdAt)}
                      </span>
                      
                      {!notification.isRead && (
                        <Badge variant="destructive" className="text-xs">
                          New
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Action Button */}
                  {link !== '#' && (
                    <Link href={link}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleNotificationClick(notification)}
                        className="flex-shrink-0"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
