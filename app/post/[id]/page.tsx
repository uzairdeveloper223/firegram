"use client"

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { PostView } from '@/components/posts/post-view'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { FiregramPost } from '@/lib/types'
import { getPost } from '@/lib/posts'
import { useAuth } from '@/components/auth/auth-provider'
import { ArrowLeft, AlertTriangle } from 'lucide-react'

export default function PostPage() {
  const params = useParams()
  const router = useRouter()
  const { userProfile } = useAuth()
  const postId = params.id as string

  const [post, setPost] = useState<FiregramPost | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (postId) {
      loadPost()
    }
  }, [postId])

  const loadPost = async () => {
    setLoading(true)
    setError(null)

    try {
      const postData = await getPost(postId)
      
      if (!postData) {
        setError('Post not found')
        return
      }

      // Check if user can view this post
      if (postData.privacy === 'private' && postData.authorId !== userProfile?.uid) {
        setError('This post is private')
        return
      }

      if (postData.privacy === 'followers') {
        // TODO: Check if user follows the author
        // For now, allow viewing if user is logged in
        if (!userProfile) {
          setError('You must be logged in to view this post')
          return
        }
      }

      setPost(postData)
    } catch (error) {
      console.error('Error loading post:', error)
      setError('Failed to load post')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto">
          <Card className="bg-white">
            <CardContent className="p-6">
              <div className="animate-pulse">
                {/* Header */}
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="bg-gray-200 h-4 rounded w-32 mb-2"></div>
                    <div className="bg-gray-200 h-3 rounded w-24"></div>
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-3 mb-4">
                  <div className="bg-gray-200 h-4 rounded"></div>
                  <div className="bg-gray-200 h-4 rounded w-3/4"></div>
                </div>

                {/* Image placeholder */}
                <div className="bg-gray-200 h-64 rounded-lg mb-4"></div>

                {/* Engagement */}
                <div className="flex space-x-6">
                  <div className="bg-gray-200 h-6 rounded w-16"></div>
                  <div className="bg-gray-200 h-6 rounded w-16"></div>
                  <div className="bg-gray-200 h-6 rounded w-16"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    )
  }

  if (error || !post) {
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
              {error || 'Post not found'}
            </AlertDescription>
          </Alert>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <Button
          onClick={() => router.back()}
          variant="outline"
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <PostView post={post} />
      </div>
    </AppLayout>
  )
}
