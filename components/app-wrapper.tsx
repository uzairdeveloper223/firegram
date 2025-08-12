"use client"

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/auth/auth-provider'
import { MaintenanceScreen } from '@/components/maintenance/maintenance-screen'
import { BannedScreen } from '@/components/banned/banned-screen'
import { getAdminSettings, checkUserBanStatus, listenToAdminSettings, AdminSettings, UserBan } from '@/lib/admin'

interface AppWrapperProps {
  children: React.ReactNode
}

export function AppWrapper({ children }: AppWrapperProps) {
  const { user, userProfile, loading } = useAuth()
  const [adminSettings, setAdminSettings] = useState<AdminSettings | null>(null)
  const [userBan, setUserBan] = useState<UserBan | null>(null)
  const [settingsLoading, setSettingsLoading] = useState(true)

  useEffect(() => {
    // Load initial admin settings
    loadAdminSettings()
    
    // Listen to settings changes
    const unsubscribe = listenToAdminSettings((settings) => {
      setAdminSettings(settings)
    })

    return unsubscribe
  }, [])

  useEffect(() => {
    if (userProfile) {
      checkBanStatus()
    }
  }, [userProfile])

  const loadAdminSettings = async () => {
    try {
      const settings = await getAdminSettings()
      setAdminSettings(settings)
    } catch (error) {
      console.error('Error loading admin settings:', error)
    } finally {
      setSettingsLoading(false)
    }
  }

  const checkBanStatus = async () => {
    if (!userProfile) return
    
    try {
      const banStatus = await checkUserBanStatus(userProfile.uid)
      setUserBan(banStatus)
    } catch (error) {
      console.error('Error checking ban status:', error)
    }
  }

  // Show loading while checking settings and user status
  if (loading || settingsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 bg-blue-800 rounded-full mx-auto mb-4 animate-pulse"></div>
          <p className="text-gray-600">Loading Firegram...</p>
        </div>
      </div>
    )
  }

  // Show maintenance screen if maintenance mode is enabled
  if (adminSettings?.maintenanceMode.enabled) {
    // Check if current user is admin - they can still access during maintenance
    const isAdminUser = userProfile?.email === "uzairxdev223@gmail.com"
    
    if (!isAdminUser) {
      return <MaintenanceScreen settings={adminSettings} />
    }
  }

  // Show banned screen if user is banned
  if (userProfile && userBan) {
    return <BannedScreen ban={userBan} />
  }

  // Show normal app
  return <>{children}</>
}
