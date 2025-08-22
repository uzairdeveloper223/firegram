"use client"

import Image from 'next/image'
import { useAuth } from '@/components/auth/auth-provider'
import { AuthForm } from '@/components/auth/auth-form'
import { MainFeed } from '@/components/feed/main-feed'
import { AppLayout } from '@/components/layout/app-layout'

export default function HomePage() {
  const { user, userProfile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="firegram-loading w-8 h-8 mx-auto mb-4">
            <Image
              src="/favicon.svg"
              alt="Firegram Logo"
              width={32}
              height={32}
              className="w-full h-full"
            />
          </div>
          <p className="text-gray-600">Loading Firegram...</p>
        </div>
      </div>
    )
  }

  if (!user || !userProfile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AuthForm />
      </div>
    )
  }

  return (
    <AppLayout>
      <MainFeed />
    </AppLayout>
  )
}
