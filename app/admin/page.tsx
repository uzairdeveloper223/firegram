"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/auth-provider'
import { isAdmin } from '@/lib/admin'
import { AdminDashboard } from '@/components/admin/admin-dashboard'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, Shield } from 'lucide-react'

export default function AdminPage() {
  const { userProfile, loading } = useAuth()
  const router = useRouter()
  const [authorized, setAuthorized] = useState<boolean | null>(null)

  useEffect(() => {
    if (loading) return

    if (!userProfile) {
      router.push('/')
      return
    }

    const adminAccess = isAdmin(userProfile.email)
    setAuthorized(adminAccess)

    if (!adminAccess) {
      // Redirect after showing unauthorized message
      setTimeout(() => router.push('/'), 3000)
    }
  }, [userProfile, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 bg-blue-800 rounded-full mx-auto mb-4 animate-pulse"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!userProfile) {
    return null
  }

  if (authorized === false) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Card className="bg-white border-red-200">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              
              <h2 className="text-xl font-bold text-gray-900 mb-4">Access Denied</h2>
              
              <Alert className="border-red-200 bg-red-50 mb-4">
                <Shield className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  You don't have permission to access the admin panel.
                  Only authorized administrators can view this page.
                </AlertDescription>
              </Alert>
              
              <p className="text-gray-600 mb-4">
                Redirecting you back to the main page in a few seconds...
              </p>
              
              <div className="text-sm text-gray-500">
                If you believe this is an error, please contact support.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (authorized === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 bg-blue-800 rounded-full mx-auto mb-4 animate-pulse"></div>
          <p className="text-gray-600">Verifying access...</p>
        </div>
      </div>
    )
  }

  return <AdminDashboard />
}
