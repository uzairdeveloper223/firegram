"use client"

import { useState, useEffect } from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { NotificationsList } from '@/components/notifications/notifications-list'
import { NotificationFilters } from '@/components/notifications/notification-filters'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/auth/auth-provider'
import { FiregramNotification } from '@/lib/types'
import { getUserNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '@/lib/notifications'
import { Bell, CheckCheck } from 'lucide-react'

export default function NotificationsPage() {
  const { userProfile } = useAuth()
  
  const [notifications, setNotifications] = useState<FiregramNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread' | 'likes' | 'comments' | 'follows' | 'mentions' | 'messages' | 'admin'>('all')

  useEffect(() => {
    if (userProfile) {
      loadNotifications()
    }
  }, [userProfile])

  const loadNotifications = async () => {
    if (!userProfile) return

    try {
      setLoading(true)
      const userNotifications = await getUserNotifications(userProfile.uid)
      setNotifications(userNotifications)
    } catch (error) {
      console.error('Error loading notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId)
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      )
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const handleMarkAllAsRead = async () => {
    if (!userProfile) return

    try {
      await markAllNotificationsAsRead(userProfile.uid)
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }

  const filteredNotifications = notifications.filter(notification => {
    switch (filter) {
      case 'unread':
        return !notification.isRead
      case 'likes':
        return notification.type === 'like'
      case 'comments':
        return notification.type === 'comment'
      case 'follows':
        return notification.type === 'follow'
      case 'mentions':
        return notification.type === 'mention'
      case 'messages':
        return notification.type === 'message'
      case 'admin':
        return notification.type === 'admin'
      default:
        return true
    }
  })

  const unreadCount = notifications.filter(n => !n.isRead).length

  if (!userProfile) {
    return null
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Bell className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount} unread
              </Badge>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <Button
                onClick={handleMarkAllAsRead}
                variant="outline"
                size="sm"
              >
                <CheckCheck className="w-4 h-4 mr-2" />
                Mark All Read
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <NotificationFilters
          activeFilter={filter}
          onFilterChange={setFilter}
          counts={{
            all: notifications.length,
            unread: unreadCount,
            likes: notifications.filter(n => n.type === 'like').length,
            comments: notifications.filter(n => n.type === 'comment').length,
            follows: notifications.filter(n => n.type === 'follow').length,
            mentions: notifications.filter(n => n.type === 'mention').length,
            messages: notifications.filter(n => n.type === 'message').length,
            admin: notifications.filter(n => n.type === 'admin').length,
          }}
        />

        {/* Notifications List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {filter === 'all' ? 'All Notifications' : 
               filter === 'unread' ? 'Unread Notifications' :
               `${filter.charAt(0).toUpperCase() + filter.slice(1)} Notifications`}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <NotificationsList
              notifications={filteredNotifications}
              loading={loading}
              onMarkAsRead={handleMarkAsRead}
              currentUserId={userProfile.uid}
            />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
