"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FiregramUser, FiregramPost } from '@/lib/types'
import { database } from '@/lib/firebase'
import { ref, onValue, off, query, orderByChild, equalTo } from 'firebase/database'
import { Heart, MessageCircle, Share, Pin } from 'lucide-react'

interface ProfileGridProps {
  user: FiregramUser
  isOwnProfile: boolean
}

export function ProfileGrid({ user, isOwnProfile }: ProfileGridProps) {
  const [posts, setPosts] = useState<FiregramPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadUserPosts()
    return () => {
      // Cleanup listeners
    }
  }, [user.uid])

  const loadUserPosts = () => {
    setLoading(true)
    setError(null)

    const postsRef = ref(database, 'posts')
    const userPostsQuery = query(postsRef, orderByChild('authorId'), equalTo(user.uid))

    const unsubscribe = onValue(userPostsQuery, (snapshot) => {
      if (snapshot.exists()) {
        const postsData = snapshot.val()
        const userPosts = Object.keys(postsData)
          .map(key => ({ id: key, ...postsData[key] }))
          .sort((a, b) => b.createdAt - a.createdAt) // Sort by newest first

        setPosts(userPosts)
      } else {
        setPosts([])
      }
      setLoading(false)
    }, (error) => {
      console.error('Error loading posts:', error)
      setError('Failed to load posts')
      setLoading(false)
    })

    return unsubscribe
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="bg-white">
            <CardContent className="p-0">
              <div className="animate-pulse">
                <div className="bg-gray-200 aspect-square rounded-t-lg"></div>
                <div className="p-4 space-y-2">
                  <div className="bg-gray-200 h-4 rounded"></div>
                  <div className="bg-gray-200 h-3 rounded w-2/3"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card className="bg-white">
        <CardContent className="p-8 text-center">
          <p className="text-red-600">{error}</p>
          <Button onClick={loadUserPosts} className="mt-4">
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (posts.length === 0) {
    return (
      <Card className="bg-white">
        <CardContent className="p-12 text-center">
          <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
            <MessageCircle className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Posts Yet</h3>
          <p className="text-gray-500 mb-6">
            {isOwnProfile 
              ? "Share your first post to get started on Firegram!" 
              : `${user.username} hasn't shared any posts yet.`
            }
          </p>
          {isOwnProfile && (
            <Button asChild className="firegram-primary">
              <Link href="/create">Create Your First Post</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Pinned Posts */}
      {posts.some(post => post.isPinned) && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <Pin className="w-5 h-5 mr-2" />
            Pinned Posts
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {posts
              .filter(post => post.isPinned)
              .map(post => (
                <PostGridItem key={post.id} post={post} isPinned />
              ))}
          </div>
        </div>
      )}

      {/* Regular Posts */}
      <div>
        {posts.some(post => post.isPinned) && (
          <h3 className="text-lg font-medium text-gray-900 mb-4">Posts</h3>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {posts
            .filter(post => !post.isPinned)
            .map(post => (
              <PostGridItem key={post.id} post={post} />
            ))}
        </div>
      </div>
    </div>
  )
}

interface PostGridItemProps {
  post: FiregramPost
  isPinned?: boolean
}

function PostGridItem({ post, isPinned }: PostGridItemProps) {
  return (
    <Link href={`/post/${post.id}`}>
      <Card className="bg-white hover:shadow-md transition-shadow group">
        <CardContent className="p-0">
          <div className="relative">
            {/* Main Image */}
            <div className="aspect-square bg-gray-100 rounded-t-lg overflow-hidden">
              {post.images && post.images.length > 0 ? (
                <img
                  src={post.images[0]}
                  alt="Post"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-200">
                  <MessageCircle className="h-12 w-12 text-gray-400" />
                </div>
              )}
            </div>

            {/* Multiple Images Indicator */}
            {post.images && post.images.length > 1 && (
              <div className="absolute top-2 right-2">
                <div className="bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded-full">
                  +{post.images.length - 1}
                </div>
              </div>
            )}

            {/* Pinned Badge */}
            {isPinned && (
              <div className="absolute top-2 left-2">
                <div className="bg-blue-800 text-white text-xs px-2 py-1 rounded-full flex items-center">
                  <Pin className="w-3 h-3 mr-1" />
                  Pinned
                </div>
              </div>
            )}

            {/* Featured Badge */}
            {post.isFeatured && (
              <div className="absolute top-2 left-2">
                <div className="bg-gradient-to-r from-blue-800 to-green-600 text-white text-xs px-2 py-1 rounded-full">
                  Featured
                </div>
              </div>
            )}
          </div>

          {/* Post Info */}
          <div className="p-4">
            <p className="text-sm text-gray-900 line-clamp-2 mb-2">
              {post.content}
            </p>
            
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center space-x-3">
                <span className="flex items-center">
                  <Heart className="w-3 h-3 mr-1" />
                  {post.likesCount || 0}
                </span>
                <span className="flex items-center">
                  <MessageCircle className="w-3 h-3 mr-1" />
                  {post.commentsCount || 0}
                </span>
                <span className="flex items-center">
                  <Share className="w-3 h-3 mr-1" />
                  {post.sharesCount || 0}
                </span>
              </div>
              <span>
                {new Date(post.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
