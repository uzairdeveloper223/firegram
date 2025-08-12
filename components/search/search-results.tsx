"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { FiregramUser, FiregramPost } from '@/lib/types'
import { useAuth } from '@/components/auth/auth-provider'
import { database } from '@/lib/firebase'
import { ref, get, query, orderByChild } from 'firebase/database'
import { Heart, MessageCircle, Share, Users, Search, Shield, Star } from 'lucide-react'

interface SearchResultsProps {
  query: string
  type: 'users' | 'posts'
}

export function SearchResults({ query, type }: SearchResultsProps) {
  const { userProfile } = useAuth()
  const [results, setResults] = useState<(FiregramUser | FiregramPost)[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (query) {
      performSearch()
    }
  }, [query, type])

  const performSearch = async () => {
    setLoading(true)
    setError(null)
    
    try {
      if (type === 'users') {
        await searchUsers()
      } else {
        await searchPosts()
      }
    } catch (error) {
      console.error('Search error:', error)
      setError('Failed to perform search')
    } finally {
      setLoading(false)
    }
  }

  const searchUsers = async () => {
    const usersRef = ref(database, 'users')
    const snapshot = await get(usersRef)
    
    if (!snapshot.exists()) {
      setResults([])
      return
    }

    const users = snapshot.val()
    const searchResults: FiregramUser[] = []

    Object.keys(users).forEach(uid => {
      const user = { uid, ...users[uid] } as FiregramUser
      
      // Search logic
      const searchQuery = query.toLowerCase()
      
      if (searchQuery.startsWith('@')) {
        // Username search
        const username = searchQuery.substring(1)
        if (user.username.toLowerCase().includes(username)) {
          searchResults.push(user)
        }
      } else if (searchQuery === 'verified') {
        // Filter verified users
        if (user.isVerified) {
          searchResults.push(user)
        }
      } else if (searchQuery === 'business') {
        // Filter business users
        if (user.mysteryMartLinked) {
          searchResults.push(user)
        }
      } else if (searchQuery === 'advanced') {
        // Filter advanced users
        if (user.isAdvancedUser) {
          searchResults.push(user)
        }
      } else {
        // General search in username, full name, bio
        const searchableText = `${user.username} ${user.fullName} ${user.bio || ''}`.toLowerCase()
        if (searchableText.includes(searchQuery)) {
          searchResults.push(user)
        }
      }
    })

    // Sort results by relevance and follower count
    searchResults.sort((a, b) => {
      // Exact matches first
      const aExact = a.username.toLowerCase() === query.toLowerCase()
      const bExact = b.username.toLowerCase() === query.toLowerCase()
      if (aExact && !bExact) return -1
      if (!aExact && bExact) return 1
      
      // Then by follower count
      return (b.followersCount || 0) - (a.followersCount || 0)
    })

    setResults(searchResults.slice(0, 50)) // Limit to 50 results
  }

  const searchPosts = async () => {
    const postsRef = ref(database, 'posts')
    const snapshot = await get(postsRef)
    
    if (!snapshot.exists()) {
      setResults([])
      return
    }

    const posts = snapshot.val()
    const searchResults: FiregramPost[] = []

    Object.keys(posts).forEach(postId => {
      const post = { id: postId, ...posts[postId] } as FiregramPost
      
      // Only search public posts or user's own posts
      if (post.privacy === 'public' || post.authorId === userProfile?.uid) {
        const searchQuery = query.toLowerCase()
        
        if (searchQuery.startsWith('#')) {
          // Hashtag search
          const hashtag = searchQuery.substring(1)
          if (post.content.toLowerCase().includes(`#${hashtag}`)) {
            searchResults.push(post)
          }
        } else {
          // Content search
          if (post.content.toLowerCase().includes(searchQuery)) {
            searchResults.push(post)
          }
        }
      }
    })

    // Sort by recency and engagement
    searchResults.sort((a, b) => {
      // Featured posts first for Advanced Users
      if (a.isFeatured && !b.isFeatured) return -1
      if (!a.isFeatured && b.isFeatured) return 1
      
      // Then by engagement (likes + comments)
      const aEngagement = (a.likesCount || 0) + (a.commentsCount || 0)
      const bEngagement = (b.likesCount || 0) + (b.commentsCount || 0)
      
      if (aEngagement !== bEngagement) {
        return bEngagement - aEngagement
      }
      
      // Finally by recency
      return b.createdAt - a.createdAt
    })

    setResults(searchResults.slice(0, 50)) // Limit to 50 results
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="bg-white">
            <CardContent className="p-4">
              <div className="animate-pulse flex items-center space-x-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="bg-gray-200 h-4 rounded w-32"></div>
                  <div className="bg-gray-200 h-3 rounded w-48"></div>
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
          <div className="w-16 h-16 bg-red-100 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Search className="h-8 w-8 text-red-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Search Error</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={performSearch} variant="outline">
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (results.length === 0) {
    return (
      <Card className="bg-white">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Search className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Results Found</h3>
          <p className="text-gray-600 mb-4">
            No {type} found for "{query}". Try different keywords or check your spelling.
          </p>
          <div className="space-y-2 text-sm text-gray-500">
            <p>Search tips:</p>
            <ul className="text-left space-y-1">
              <li>• Use @ for usernames (@john_doe)</li>
              <li>• Use # for hashtags (#photography)</li>
              <li>• Try "verified", "business", or "advanced" to filter users</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Found {results.length} {type} for "{query}"
        </p>
      </div>

      {type === 'users' ? (
        <div className="space-y-4">
          {(results as FiregramUser[]).map((user) => (
            <UserResult key={user.uid} user={user} />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {(results as FiregramPost[]).map((post) => (
            <PostResult key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  )
}

interface UserResultProps {
  user: FiregramUser
}

function UserResult({ user }: UserResultProps) {
  return (
    <Link href={`/profile/${user.username}`}>
      <Card className="bg-white hover:bg-gray-50 transition-colors cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <Avatar className="w-12 h-12">
              <AvatarImage src={user.profilePicture} />
              <AvatarFallback className="bg-blue-800 text-white">
                {user.fullName?.charAt(0)?.toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="font-medium text-gray-900">{user.username}</h3>
                
                {user.isVerified && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    <Shield className="w-3 h-3 mr-1" />
                    Verified
                  </Badge>
                )}
                
                {user.isAdvancedUser && (
                  <Badge className="advanced-user-indicator">
                    <Star className="w-3 h-3 mr-1" />
                    Advanced
                  </Badge>
                )}
                
                {user.mysteryMartLinked && (
                  <Badge variant="outline" className="border-green-600 text-green-600">
                    Business
                  </Badge>
                )}
              </div>
              
              <p className="text-sm text-gray-600">{user.fullName}</p>
              
              {user.bio && (
                <p className="text-sm text-gray-500 line-clamp-1 mt-1">
                  {user.bio}
                </p>
              )}
              
              <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                <span className="flex items-center">
                  <Users className="w-3 h-3 mr-1" />
                  {user.followersCount || 0} followers
                </span>
                <span>{user.postsCount || 0} posts</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

interface PostResultProps {
  post: FiregramPost
}

function PostResult({ post }: PostResultProps) {
  return (
    <Link href={`/post/${post.id}`}>
      <Card className="bg-white hover:bg-gray-50 transition-colors cursor-pointer">
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Post Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium text-gray-900">
                  Post by @{post.authorId.substring(0, 8)}...
                </p>
                {post.isFeatured && (
                  <Badge className="bg-gradient-to-r from-blue-800 to-green-600 text-white">
                    Featured
                  </Badge>
                )}
              </div>
              <p className="text-xs text-gray-500">
                {new Date(post.createdAt).toLocaleDateString()}
              </p>
            </div>

            {/* Post Content */}
            <div>
              <p className="text-gray-700 line-clamp-3">
                {post.content}
              </p>
              
              {post.images && post.images.length > 0 && (
                <div className="mt-3 flex space-x-2">
                  {post.images.slice(0, 3).map((image, index) => (
                    <div key={index} className="relative">
                      <img
                        src={image}
                        alt={`Post image ${index + 1}`}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                      {index === 2 && post.images!.length > 3 && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                          <span className="text-white text-xs font-medium">
                            +{post.images!.length - 3}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Post Engagement */}
            <div className="flex items-center justify-between text-sm text-gray-500">
              <div className="flex items-center space-x-4">
                <span className="flex items-center">
                  <Heart className="w-4 h-4 mr-1" />
                  {post.likesCount || 0}
                </span>
                <span className="flex items-center">
                  <MessageCircle className="w-4 h-4 mr-1" />
                  {post.commentsCount || 0}
                </span>
                <span className="flex items-center">
                  <Share className="w-4 h-4 mr-1" />
                  {post.sharesCount || 0}
                </span>
              </div>
              
              <Badge variant="outline" className="text-xs">
                {post.privacy}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
