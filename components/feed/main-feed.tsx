"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PostView } from '@/components/posts/post-view'
import { useAuth } from '@/components/auth/auth-provider'
import { FiregramPost } from '@/lib/types'
import { database } from '@/lib/firebase'
import { ref, get, query, orderByChild, limitToLast } from 'firebase/database'
import { PlusSquare, Zap, Users, Sparkles, TrendingUp } from 'lucide-react'

export function MainFeed() {
  const { userProfile } = useAuth()
  const router = useRouter()
  const [posts, setPosts] = useState<FiregramPost[]>([])
  const [featuredPosts, setFeaturedPosts] = useState<FiregramPost[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('following')

  useEffect(() => {
    if (userProfile) {
      loadFeed()
    }
  }, [userProfile])

  const loadFeed = async () => {
    setLoading(true)
    
    try {
      await Promise.all([
        loadFollowingPosts(),
        loadFeaturedPosts()
      ])
    } catch (error) {
      console.error('Error loading feed:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadFollowingPosts = async () => {
    if (!userProfile) return

    try {
      // Get user's following list
      const followingRef = ref(database, `follows/${userProfile.uid}/following`)
      const followingSnapshot = await get(followingRef)
      
      let followingIds: string[] = []
      if (followingSnapshot.exists()) {
        followingIds = Object.keys(followingSnapshot.val())
      }
      
      // Include user's own posts
      followingIds.push(userProfile.uid)

      // Get all posts
      const postsRef = ref(database, 'posts')
      const postsSnapshot = await get(postsRef)
      
      if (!postsSnapshot.exists()) {
        setPosts([])
        return
      }

      const allPosts = postsSnapshot.val()
      const feedPosts: FiregramPost[] = []

      Object.keys(allPosts).forEach(postId => {
        const post = { id: postId, ...allPosts[postId] } as FiregramPost
        
        // Include posts from followed users and public posts
        if (followingIds.includes(post.authorId) || post.privacy === 'public') {
          feedPosts.push(post)
        }
      })

      // Sort by creation date (newest first)
      feedPosts.sort((a, b) => b.createdAt - a.createdAt)
      
      setPosts(feedPosts.slice(0, 20)) // Limit to 20 posts
    } catch (error) {
      console.error('Error loading following posts:', error)
      setPosts([])
    }
  }

  const loadFeaturedPosts = async () => {
    try {
      const postsRef = ref(database, 'posts')
      const postsSnapshot = await get(postsRef)
      
      if (!postsSnapshot.exists()) {
        setFeaturedPosts([])
        return
      }

      const allPosts = postsSnapshot.val()
      const featured: FiregramPost[] = []

      Object.keys(allPosts).forEach(postId => {
        const post = { id: postId, ...allPosts[postId] } as FiregramPost
        
        // Only show public featured posts
        if (post.isFeatured && post.privacy === 'public') {
          featured.push(post)
        }
      })

      // Sort by engagement and recency
      featured.sort((a, b) => {
        const aEngagement = (a.likesCount || 0) + (a.commentsCount || 0)
        const bEngagement = (b.likesCount || 0) + (b.commentsCount || 0)
        
        if (aEngagement !== bEngagement) {
          return bEngagement - aEngagement
        }
        
        return b.createdAt - a.createdAt
      })
      
      setFeaturedPosts(featured.slice(0, 10)) // Limit to 10 featured posts
    } catch (error) {
      console.error('Error loading featured posts:', error)
      setFeaturedPosts([])
    }
  }

  const loadDiscoverPosts = async () => {
    try {
      const postsRef = ref(database, 'posts')
      const postsSnapshot = await get(postsRef)
      
      if (!postsSnapshot.exists()) {
        return []
      }

      const allPosts = postsSnapshot.val()
      const discover: FiregramPost[] = []

      Object.keys(allPosts).forEach(postId => {
        const post = { id: postId, ...allPosts[postId] } as FiregramPost
        
        // Only show public posts
        if (post.privacy === 'public') {
          discover.push(post)
        }
      })

      // Sort by engagement for discovery
      discover.sort((a, b) => {
        const aEngagement = (a.likesCount || 0) + (a.commentsCount || 0) + (a.sharesCount || 0)
        const bEngagement = (b.likesCount || 0) + (b.commentsCount || 0) + (b.sharesCount || 0)
        return bEngagement - aEngagement
      })
      
      return discover.slice(0, 15) // Limit to 15 posts
    } catch (error) {
      console.error('Error loading discover posts:', error)
      return []
    }
  }

  const handleLearnMore = () => {
    if (userProfile?.username) {
      // Add a query parameter to trigger scrolling on the destination page
      router.push(`/profile/${userProfile.username}/edit?scrollToBottom=true`)
    }
  }

  if (!userProfile) {
    return null
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Create Post Card */}
      <Card className="bg-white">
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-800 rounded-full flex items-center justify-center">
              <PlusSquare className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Share something amazing</h3>
              <p className="text-gray-600 mb-4">
                What's on your mind? Share your thoughts, photos, or experiences with the community.
              </p>
              <Button asChild className="firegram-primary">
                <Link href="/create">
                  <PlusSquare className="w-4 h-4 mr-2" />
                  Create Post
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feed Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="following" className="flex items-center">
            <Users className="w-4 h-4 mr-2" />
            Following
          </TabsTrigger>
          <TabsTrigger value="featured" className="flex items-center">
            <Sparkles className="w-4 h-4 mr-2" />
            Featured
          </TabsTrigger>
          <TabsTrigger value="discover" className="flex items-center">
            <TrendingUp className="w-4 h-4 mr-2" />
            Discover
          </TabsTrigger>
        </TabsList>

        <TabsContent value="following" className="mt-6">
          <div className="space-y-6">
            {loading ? (
              <FeedSkeleton />
            ) : posts.length > 0 ? (
              posts.map(post => (
                <PostView key={post.id} post={post} compact />
              ))
            ) : (
              <EmptyFeed type="following" />
            )}
          </div>
        </TabsContent>

        <TabsContent value="featured" className="mt-6">
          <div className="space-y-6">
            {loading ? (
              <FeedSkeleton />
            ) : featuredPosts.length > 0 ? (
              featuredPosts.map(post => (
                <PostView key={post.id} post={post} compact />
              ))
            ) : (
              <EmptyFeed type="featured" />
            )}
          </div>
        </TabsContent>

        <TabsContent value="discover" className="mt-6">
          <DiscoverFeed />
        </TabsContent>
      </Tabs>

      {/* Upgrade Prompt for Advanced Features */}
      {!userProfile.isAdvancedUser && (
        <Card className="bg-gradient-to-br from-blue-50 to-green-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-800 to-green-600 rounded-full flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-blue-900 mb-2">Upgrade to Advanced User</h3>
                <p className="text-blue-700 mb-4">
                  Get featured posts, unlimited pins, analytics, and exclusive features.
                </p>
                <Button 
                  onClick={handleLearnMore}
                  className="bg-gradient-to-r from-blue-800 to-green-600 text-white"
                >
                  Learn More
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function FeedSkeleton() {
  return (
    <div className="space-y-6">
      {[...Array(3)].map((_, i) => (
        <Card key={i} className="bg-white">
          <CardContent className="p-6">
            <div className="animate-pulse">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="bg-gray-200 h-4 rounded w-32 mb-2"></div>
                  <div className="bg-gray-200 h-3 rounded w-24"></div>
                </div>
              </div>
              <div className="space-y-3 mb-4">
                <div className="bg-gray-200 h-4 rounded"></div>
                <div className="bg-gray-200 h-4 rounded w-3/4"></div>
              </div>
              <div className="bg-gray-200 h-48 rounded-lg mb-4"></div>
              <div className="flex space-x-6">
                <div className="bg-gray-200 h-6 rounded w-16"></div>
                <div className="bg-gray-200 h-6 rounded w-16"></div>
                <div className="bg-gray-200 h-6 rounded w-16"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

interface EmptyFeedProps {
  type: 'following' | 'featured'
}

function EmptyFeed({ type }: EmptyFeedProps) {
  const suggestions = {
    following: {
      icon: Users,
      title: "Your feed is empty",
      description: "Follow other users to see their posts in your feed.",
      action: "Discover Users",
      href: "/search"
    },
    featured: {
      icon: Sparkles,
      title: "No featured posts yet",
      description: "Featured posts from Advanced Users will appear here.",
      action: "Explore Discover",
      href: "#"
    }
  }

  const suggestion = suggestions[type]

  return (
    <Card className="bg-white">
      <CardContent className="p-8 text-center">
        <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
          <suggestion.icon className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">{suggestion.title}</h3>
        <p className="text-gray-500 mb-6">{suggestion.description}</p>
        <div className="flex justify-center space-x-3">
          <Button asChild className="firegram-primary">
            <Link href="/create">Create Post</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={suggestion.href}>{suggestion.action}</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function DiscoverFeed() {
  const [discoverPosts, setDiscoverPosts] = useState<FiregramPost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDiscoverPosts()
  }, [])

  const loadDiscoverPosts = async () => {
    try {
      const postsRef = ref(database, 'posts')
      const postsSnapshot = await get(postsRef)
      
      if (!postsSnapshot.exists()) {
        setDiscoverPosts([])
        return
      }

      const allPosts = postsSnapshot.val()
      const discover: FiregramPost[] = []

      Object.keys(allPosts).forEach(postId => {
        const post = { id: postId, ...allPosts[postId] } as FiregramPost
        
        if (post.privacy === 'public') {
          discover.push(post)
        }
      })

      discover.sort((a, b) => {
        const aEngagement = (a.likesCount || 0) + (a.commentsCount || 0) + (a.sharesCount || 0)
        const bEngagement = (b.likesCount || 0) + (b.commentsCount || 0) + (b.sharesCount || 0)
        return bEngagement - aEngagement
      })
      
      setDiscoverPosts(discover.slice(0, 15))
    } catch (error) {
      console.error('Error loading discover posts:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <FeedSkeleton />
  }

  if (discoverPosts.length === 0) {
    return <EmptyFeed type="featured" />
  }

  return (
    <div className="space-y-6">
      {discoverPosts.map(post => (
        <PostView key={post.id} post={post} compact />
      ))}
    </div>
  )
}
