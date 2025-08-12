"use client"

import { CreatePostForm } from '@/components/posts/create-post-form'
import { AppLayout } from '@/components/layout/app-layout'
import { useAuth } from '@/components/auth/auth-provider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PlusSquare } from 'lucide-react'

export default function CreatePage() {
  const { userProfile } = useAuth()

  if (!userProfile) {
    return null
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <PlusSquare className="w-6 h-6 text-blue-800" />
              <span>Create New Post</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CreatePostForm user={userProfile} />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
