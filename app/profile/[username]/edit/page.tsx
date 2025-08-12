"use client"

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { ProfileEditForm } from '@/components/profile/profile-edit-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/auth/auth-provider'
import { ArrowLeft, AlertTriangle, Settings } from 'lucide-react'

export default function ProfileEditPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { userProfile, loading } = useAuth()
  const username = params.username as string

  const [authorized, setAuthorized] = useState<boolean | null>(null)

  useEffect(() => {
    if (loading) return

    if (!userProfile) {
      router.push('/')
      return
    }

    // Check if user is editing their own profile
    const canEdit = userProfile.username === username
    setAuthorized(canEdit)

    if (!canEdit) {
      // Redirect after showing unauthorized message
      setTimeout(() => router.push(`/profile/${username}`), 3000)
    }
  }, [userProfile, loading, username, router])

  // Handle scroll to bottom when coming from Learn More button
  useEffect(() => {
    const shouldScrollToBottom = searchParams.get('scrollToBottom')
    if (shouldScrollToBottom === 'true' && authorized === true) {
      // Wait for the page to fully render, then scroll
      const timer = setTimeout(() => {
        window.scrollTo({ 
          top: document.body.scrollHeight, 
          behavior: 'smooth' 
        })
      }, 500)
      
      return () => clearTimeout(timer)
    }
  }, [searchParams, authorized])

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto">
          <div className="animate-pulse">
            <div className="bg-gray-200 h-8 rounded w-48 mb-6"></div>
            <div className="bg-white rounded-lg p-6">
              <div className="space-y-4">
                <div className="bg-gray-200 h-4 rounded w-32"></div>
                <div className="bg-gray-200 h-10 rounded"></div>
                <div className="bg-gray-200 h-4 rounded w-32"></div>
                <div className="bg-gray-200 h-10 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (!userProfile) {
    return null
  }

  if (authorized === false) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto">
          <Button
            onClick={() => router.back()}
            variant="outline"
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>

          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              You can only edit your own profile. Redirecting you back...
            </AlertDescription>
          </Alert>
        </div>
      </AppLayout>
    )
  }

  if (authorized === null) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto">
          <div className="text-center py-8">
            <div className="w-8 h-8 bg-blue-800 rounded-full mx-auto mb-4 animate-pulse"></div>
            <p className="text-gray-600">Checking permissions...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center space-x-4 mb-6">
          <Button
            onClick={() => router.push(`/profile/${username}`)}
            variant="outline"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Profile
          </Button>
          
          <h1 className="text-2xl font-bold text-gray-900">Edit Profile</h1>
        </div>

        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ProfileEditForm user={userProfile} />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
