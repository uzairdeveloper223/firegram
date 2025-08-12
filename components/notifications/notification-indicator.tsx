"use client"

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { getUnreadNotificationsCount, listenToUserNotifications } from '@/lib/notifications'
import { useAuth } from '@/components/auth/auth-provider'

interface NotificationIndicatorProps {
  children: React.ReactNode
}

export function NotificationIndicator({ children }: NotificationIndicatorProps) {
  const { userProfile } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!userProfile?.uid) return

    // Load initial unread count
    loadUnreadCount()

    // Listen for real-time updates
    const unsubscribe = listenToUserNotifications(userProfile.uid, (notifications) => {
      const count = notifications.filter(n => !n.isRead).length
      setUnreadCount(count)
    })

    return unsubscribe
  }, [userProfile?.uid])

  const loadUnreadCount = async () => {
    if (!userProfile) return

    try {
      const count = await getUnreadNotificationsCount(userProfile.uid)
      setUnreadCount(count)
    } catch (error) {
      console.error('Error loading unread count:', error)
    }
  }

  return (
    <div className="relative">
      {children}
      {unreadCount > 0 && (
        <Badge 
          variant="destructive" 
          className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </Badge>
      )}
    </div>
  )
}
