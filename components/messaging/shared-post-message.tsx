"use client"

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Heart, MessageCircle, Share } from 'lucide-react'
import { getPost } from '@/lib/posts'
import { getCurrentUserProfile } from '@/lib/auth'
import { FiregramPost, FiregramUser } from '@/lib/types'
import Link from 'next/link'

interface SharedPostMessageProps {
  postId: string
  className?: string
}

export function SharedPostMessage({ postId, className }: SharedPostMessageProps) {
  const [post, setPost] = useState<FiregramPost | null>(null)
  const [author, setAuthor] = useState<FiregramUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadPostData = async () => {
      try {
        const postData = await getPost(postId)
        if (postData) {
          setPost(postData)
          
          const authorData = await getCurrentUserProfile(postData.authorId)
          if (authorData) {
            setAuthor(authorData)
          }
        }
      } catch (error) {
        console.error('Error loading shared post:', error)
      } finally {
        setLoading(false)
      }
    }

    loadPostData()
  }, [postId])

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <Card className="p-3 bg-gray-100">
          <div className="flex space-x-3">
            <div className="w-8 h-8 bg-gray-300 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-gray-300 rounded w-24" />
              <div className="h-16 bg-gray-300 rounded" />
            </div>
          </div>
        </Card>
      </div>
    )
  }

  if (!post || !author) {
    return (
      <Card className={`p-3 bg-red-50 border-red-200 ${className}`}>
        <p className="text-red-600 text-sm">Post not found or unavailable</p>
      </Card>
    )
  }

  const formatContent = (content: string) => {
    if (content.length > 100) {
      return content.substring(0, 100) + '...'
    }
    return content
  }

  return (
    <Link href={`/post/${post.id}`}>
      <Card className={`p-3 bg-blue-50 border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer ${className}`}>
        {/* Post Header */}
        <div className="flex items-center space-x-2 mb-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={author.profilePicture} />
            <AvatarFallback className="text-xs">
              {author.fullName?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium text-gray-900">
            {author.fullName}
          </span>
          <span className="text-xs text-gray-500">@{author.username}</span>
          {post.isFeatured && (
            <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded-full">
              Featured
            </span>
          )}
        </div>

        {/* Post Content */}
        <div className="space-y-2">
          <p className="text-sm text-gray-700">{formatContent(post.content)}</p>
          
          {/* Post Image */}
          {post.images && post.images.length > 0 && (
            <div className="relative rounded-lg overflow-hidden">
              <img
                src={post.images[0]}
                alt="Shared post image"
                className="w-full h-32 object-cover"
              />
            </div>
          )}

          {/* Post Stats - Simplified for message context */}
          <div className="flex items-center justify-between pt-2 border-t border-blue-200">
            <div className="flex items-center space-x-4 text-xs text-gray-500">
              <div className="flex items-center space-x-1">
                <Heart className="w-3 h-3" />
                <span>{post.likesCount || 0}</span>
              </div>
              <div className="flex items-center space-x-1">
                <MessageCircle className="w-3 h-3" />
                <span>{post.commentsCount || 0}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Share className="w-3 h-3" />
                <span>{post.sharesCount || 0}</span>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="text-xs h-6 px-2">
              View Post
            </Button>
          </div>
        </div>
      </Card>
    </Link>
  )
}
