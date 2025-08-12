"use client"

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AppStats, AdminSettings } from '@/lib/admin'
import { 
  Users, 
  MessageCircle, 
  FileText, 
  Shield, 
  Star, 
  UserX,
  Activity,
  RefreshCw,
  TrendingUp,
  AlertTriangle
} from 'lucide-react'

interface StatsOverviewProps {
  stats: AppStats | null
  onRefresh: () => void
  adminSettings: AdminSettings | null
}

export function StatsOverview({ stats, onRefresh, adminSettings }: StatsOverviewProps) {
  if (!stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
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
    )
  }

  const statsCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers.toLocaleString(),
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      description: 'Registered users'
    },
    {
      title: 'Active Users',
      value: stats.activeUsers.toLocaleString(),
      icon: Activity,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      description: 'Active in last 24h'
    },
    {
      title: 'Total Posts',
      value: stats.totalPosts.toLocaleString(),
      icon: FileText,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      description: 'Posts created'
    },
    {
      title: 'Messages',
      value: stats.totalMessages.toLocaleString(),
      icon: MessageCircle,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
      description: 'Total messages sent'
    },
    {
      title: 'Verified Users',
      value: stats.verifiedUsers.toLocaleString(),
      icon: Shield,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      description: 'Verified accounts'
    },
    {
      title: 'Advanced Users',
      value: stats.advancedUsers.toLocaleString(),
      icon: Star,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      description: 'Premium subscribers'
    },
    {
      title: 'Banned Users',
      value: stats.bannedUsers.toLocaleString(),
      icon: UserX,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      description: 'Currently banned'
    },
    {
      title: 'Engagement Rate',
      value: stats.totalUsers > 0 ? `${((stats.activeUsers / stats.totalUsers) * 100).toFixed(1)}%` : '0%',
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      description: 'User engagement'
    }
  ]

  const pendingRequests = [
    {
      title: 'Verification Requests',
      count: stats.pendingVerifications,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Advanced User Requests',
      count: stats.pendingAdvancedRequests,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    },
    {
      title: 'Unban Requests',
      count: stats.pendingUnbanRequests,
      color: 'text-red-600',
      bgColor: 'bg-red-100'
    }
  ]

  return (
    <div className="space-y-8">
      {/* System Status */}
      <Card className="bg-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <Activity className="w-5 h-5 mr-2" />
                System Status
              </CardTitle>
              <CardDescription>Current system health and configuration</CardDescription>
            </div>
            <Button onClick={onRefresh} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${adminSettings?.maintenanceMode.enabled ? 'bg-orange-500' : 'bg-green-500'}`}></div>
              <div>
                <p className="font-medium">
                  {adminSettings?.maintenanceMode.enabled ? 'Maintenance Mode' : 'Operational'}
                </p>
                <p className="text-sm text-gray-500">
                  {adminSettings?.maintenanceMode.enabled ? 'System under maintenance' : 'All systems running'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${adminSettings?.registrationEnabled ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <div>
                <p className="font-medium">Registration</p>
                <p className="text-sm text-gray-500">
                  {adminSettings?.registrationEnabled ? 'Open' : 'Closed'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${adminSettings?.verificationEnabled ? 'bg-green-500' : 'bg-gray-500'}`}></div>
              <div>
                <p className="font-medium">Verification</p>
                <p className="text-sm text-gray-500">
                  {adminSettings?.verificationEnabled ? 'Enabled' : 'Disabled'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Statistics */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Statistics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statsCards.map((stat, index) => (
            <Card key={index} className="bg-white hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stat.value}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {stat.description}
                    </p>
                  </div>
                  <div className={`${stat.bgColor} p-3 rounded-lg`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Pending Requests */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 text-orange-600" />
            Pending Requests
          </CardTitle>
          <CardDescription>
            Requests requiring administrative review
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {pendingRequests.map((request, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{request.title}</p>
                  <p className="text-sm text-gray-500">Awaiting review</p>
                </div>
                <Badge variant={request.count > 0 ? "default" : "secondary"} className={request.count > 0 ? request.bgColor : ''}>
                  {request.count}
                </Badge>
              </div>
            ))}
          </div>
          
          {(stats.pendingVerifications > 0 || stats.pendingAdvancedRequests > 0 || stats.pendingUnbanRequests > 0) && (
            <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-sm text-orange-800">
                <AlertTriangle className="w-4 h-4 inline mr-1" />
                You have pending requests that require attention. 
                Check the "Requests" tab to review them.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common administrative tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="justify-start h-auto p-4">
              <Users className="w-5 h-5 mr-3" />
              <div className="text-left">
                <p className="font-medium">Manage Users</p>
                <p className="text-sm text-gray-500">View and moderate users</p>
              </div>
            </Button>
            
            <Button variant="outline" className="justify-start h-auto p-4">
              <MessageCircle className="w-5 h-5 mr-3" />
              <div className="text-left">
                <p className="font-medium">Review Requests</p>
                <p className="text-sm text-gray-500">Process pending requests</p>
              </div>
            </Button>
            
            <Button variant="outline" className="justify-start h-auto p-4">
              <Shield className="w-5 h-5 mr-3" />
              <div className="text-left">
                <p className="font-medium">System Settings</p>
                <p className="text-sm text-gray-500">Configure app settings</p>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
