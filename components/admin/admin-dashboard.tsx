"use client"

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { StatsOverview } from './stats-overview'
import { MaintenanceControl } from './maintenance-control'
import { UserManagement } from './user-management'
import { RequestManagement } from './request-management'
import { SystemSettings } from './system-settings'
import { MediaManagement } from './media-management'
import { AdminSettings, getAdminSettings, listenToAdminSettings, getAppStats, AppStats } from '@/lib/admin'
import {
  BarChart3,
  Settings,
  Users,
  MessageSquare,
  Wrench,
  Shield,
  HardDrive
} from 'lucide-react'

export function AdminDashboard() {
  const [adminSettings, setAdminSettings] = useState<AdminSettings | null>(null)
  const [appStats, setAppStats] = useState<AppStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    loadInitialData()
    
    // Listen to admin settings changes
    const unsubscribe = listenToAdminSettings((settings) => {
      setAdminSettings(settings)
    })

    return unsubscribe
  }, [])

  const loadInitialData = async () => {
    try {
      const [settings, stats] = await Promise.all([
        getAdminSettings(),
        getAppStats()
      ])
      
      setAdminSettings(settings)
      setAppStats(stats)
    } catch (error) {
      console.error('Error loading admin data:', error)
    } finally {
      setLoading(false)
    }
  }

  const refreshStats = async () => {
    try {
      const stats = await getAppStats()
      setAppStats(stats)
    } catch (error) {
      console.error('Error refreshing stats:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="w-64 h-8 bg-gray-200 rounded animate-pulse mb-2"></div>
            <div className="w-48 h-4 bg-gray-200 rounded animate-pulse"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="bg-white">
                <CardContent className="p-6">
                  <div className="animate-pulse">
                    <div className="w-full h-4 bg-gray-200 rounded mb-3"></div>
                    <div className="w-16 h-8 bg-gray-200 rounded"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <Shield className="w-7 h-7 mr-3 text-blue-800" />
                Firegram Admin Panel
              </h1>
              <p className="text-gray-600 mt-1">
                Complete system management and monitoring
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              {adminSettings?.maintenanceMode.enabled && (
                <div className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">
                  <Wrench className="w-4 h-4 inline mr-1" />
                  Maintenance Mode Active
                </div>
              )}
              
              <div className="text-sm text-gray-500">
                Last updated: {new Date().toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="max-w-7xl mx-auto p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6 mb-8">
            <TabsTrigger value="overview" className="flex items-center">
              <BarChart3 className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center">
              <Users className="w-4 h-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="requests" className="flex items-center">
              <MessageSquare className="w-4 h-4 mr-2" />
              Requests
            </TabsTrigger>
            <TabsTrigger value="media" className="flex items-center">
              <HardDrive className="w-4 h-4 mr-2" />
              Media
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="flex items-center">
              <Wrench className="w-4 h-4 mr-2" />
              Maintenance
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <StatsOverview 
              stats={appStats} 
              onRefresh={refreshStats} 
              adminSettings={adminSettings}
            />
          </TabsContent>

          <TabsContent value="users">
            <UserManagement />
          </TabsContent>

          <TabsContent value="requests">
            <RequestManagement />
          </TabsContent>

          <TabsContent value="media">
            <MediaManagement />
          </TabsContent>

          <TabsContent value="maintenance">
            <MaintenanceControl 
              settings={adminSettings} 
              onSettingsUpdate={setAdminSettings} 
            />
          </TabsContent>

          <TabsContent value="settings">
            <SystemSettings
              adminSettings={adminSettings}
              onSettingsUpdate={loadInitialData}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
