"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { FiregramPost, FiregramUser, FiregramComment } from '@/lib/types'
import { useAuth } from '@/components/auth/auth-provider'
import { toggleLikePost, checkUserLikedPost, togglePinPost, deletePost } from '@/lib/posts'
import { database } from '@/lib/firebase'
import { ref, get, set, push, onValue, off } from 'firebase/database'
import { useToast } from '@/hooks/use-toast'
import { SharePostDialog } from './share-post-dialog'
import { 
  Heart, 
  MessageCircle, 
  Share, 
  MoreVertical, 
  Pin, 
  Trash2, 
  Edit,
  Shield,
  Star,
  Calendar,
  Eye,
  Send
} from 'lucide-react'

interface PostViewProps {
  post: FiregramPost
  compact?: boolean
  showActions?: boolean
}

export function PostView({ post, compact = false, showActions = true }: PostViewProps) {
  const { userProfile } = useAuth()
  const { toast } = useToast()

  const [author, setAuthor] = useState<FiregramUser | null>(null)
  const [liked, setLiked] = useState(false)
  const [likesCount, setLikesCount] = useState(post.likesCount || 0)
  const [comments, setComments] = useState<FiregramComment[]>([])
  const [newComment, setNewComment] = useState('')
  const [showComments, setShowComments] = useState(!compact)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadAuthor()
    loadComments()
    
    if (userProfile) {
      checkLikeStatus()
    }
  }, [post.id, userProfile])

  const loadAuthor = async () => {
    try {
      const authorRef = ref(database, `users/${post.authorId}`)
      const snapshot = await get(authorRef)
      
      if (snapshot.exists()) {
        setAuthor({ uid: post.authorId, ...snapshot.val() })
      }
    } catch (error) {
      console.error('Error loading author:', error)
    }
  }

  const loadComments = () => {
    const commentsRef = ref(database, `comments/${post.id}`)
    
    const unsubscribe = onValue(commentsRef, (snapshot) => {
      if (snapshot.exists()) {
        const commentsData = snapshot.val()
        const commentsList = Object.keys(commentsData)
          .map(key => ({ id: key, ...commentsData[key] }))
          .sort((a, b) => a.createdAt - b.createdAt)
        setComments(commentsList)
      } else {
        setComments([])
      }
    })

    return () => off(commentsRef, 'value', unsubscribe)
  }

  const checkLikeStatus = async () => {
    if (!userProfile) return
    
    try {
      const isLiked = await checkUserLikedPost(post.id!, userProfile.uid)
      setLiked(isLiked)
    } catch (error) {
      console.error('Error checking like status:', error)
    }
  }

  const handleLike = async () => {
    if (!userProfile) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to like posts",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      const result = await toggleLikePost(post.id!, userProfile.uid)
      
      if (result.success) {
        setLiked(!liked)
        setLikesCount(prev => liked ? prev - 1 : prev + 1)
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to like post",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to like post",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleComment = async () => {
    if (!userProfile || !newComment.trim()) return

    setLoading(true)
    try {
      const comment: Omit<FiregramComment, 'id'> = {
        postId: post.id!,
        authorId: userProfile.uid,
        content: newComment.trim(),
        createdAt: Date.now(),
        likesCount: 0
      }

      const commentsRef = ref(database, `comments/${post.id}`)
      const newCommentRef = push(commentsRef)
      await set(newCommentRef, comment)

      // Update post comment count
      const postRef = ref(database, `posts/${post.id}/commentsCount`)
      await set(postRef, (post.commentsCount || 0) + 1)

      setNewComment('')
      toast({ title: "Comment added" })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add comment",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePin = async () => {
    if (!userProfile || post.authorId !== userProfile.uid) return

    setLoading(true)
    try {
      const result = await togglePinPost(post.id!, post.authorId, post.isPinned || false)
      
      if (result.success) {
        toast({
          title: post.isPinned ? "Post unpinned" : "Post pinned",
          description: post.isPinned ? "Post removed from pinned posts" : "Post pinned to your profile"
        })
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to pin post",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to pin post",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!userProfile || post.authorId !== userProfile.uid) return
    
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return
    }

    setLoading(true)
    try {
      const result = await deletePost(post.id!, post.authorId)
      
      if (result.success) {
        toast({ title: "Post deleted" })
        // Navigate back or refresh
        window.location.href = `/profile/${userProfile.username}`
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete post",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete post",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }



  const isOwnPost = userProfile?.uid === post.authorId
  const postDate = new Date(post.createdAt).toLocaleDateString()

  return (
    <Card className="bg-white">
      <CardContent className="p-6">
        {/* Post Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Link href={`/profile/${author?.username}`}>
              <Avatar className="w-12 h-12 cursor-pointer">
                <AvatarImage src={author?.profilePicture} />
                <AvatarFallback className="bg-blue-800 text-white">
                  {author?.fullName?.charAt(0)?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Link>
            
            <div>
              <div className="flex items-center space-x-2">
                <Link href={`/profile/${author?.username}`}>
                  <span className="font-medium text-gray-900 hover:text-blue-800 cursor-pointer">
                    {author?.username}
                  </span>
                </Link>
                
                {author?.isVerified && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    <Shield className="w-3 h-3" />
                  </Badge>
                )}
                
                {author?.isAdvancedUser && (
                  <Badge className="advanced-user-indicator">
                    <Star className="w-3 h-3" />
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Calendar className="w-3 h-3" />
                <span>{postDate}</span>
                {post.isEdited && <span>• edited</span>}
                <Eye className="w-3 h-3" />
                <span>{post.privacy}</span>
              </div>
            </div>
          </div>

          {/* Post Actions Menu */}
          {showActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isOwnPost && (
                  <>
                    <DropdownMenuItem onClick={handlePin} disabled={loading}>
                      <Pin className="w-4 h-4 mr-2" />
                      {post.isPinned ? 'Unpin' : 'Pin'} Post
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Post
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDelete} disabled={loading} className="text-red-600">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Post
                    </DropdownMenuItem>
                  </>
                )}
                <SharePostDialog 
                  postId={post.id} 
                  currentUserId={userProfile?.uid || ''}
                >
                  <div className="flex items-center w-full px-2 py-1.5 cursor-pointer hover:bg-gray-100 rounded">
                    <Share className="w-4 h-4 mr-2" />
                    Share Post
                  </div>
                </SharePostDialog>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Post Badges */}
        <div className="flex items-center space-x-2 mb-4">
          {post.isPinned && (
            <Badge className="bg-blue-800 text-white">
              <Pin className="w-3 h-3 mr-1" />
              Pinned
            </Badge>
          )}
          
          {post.isFeatured && (
            <Badge className="bg-gradient-to-r from-blue-800 to-green-600 text-white">
              Featured
            </Badge>
          )}
        </div>

        {/* Post Content */}
        <div className="mb-4">
          <p className="text-gray-900 whitespace-pre-wrap">{post.content}</p>
        </div>

        {/* Post Images */}
        {post.images && post.images.length > 0 && (
          <div className="mb-4">
            {post.images.length === 1 ? (
              <img
                src={post.images[0]}
                alt="Post image"
                className="w-full rounded-lg max-h-96 object-cover"
              />
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {post.images.slice(0, 4).map((image, index) => (
                  <div key={index} className="relative">
                    <img
                      src={image}
                      alt={`Post image ${index + 1}`}
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    {index === 3 && post.images!.length > 4 && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                        <span className="text-white font-medium">
                          +{post.images!.length - 4} more
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Post Videos */}
        {post.videos && post.videos.length > 0 && (
          <div className="mb-4">
            {post.videos.map((video, index) => (
              <div key={index} className="relative mb-2 last:mb-0">
                <video
                  src={video}
                  controls
                  className="w-full rounded-lg max-h-96"
                  autoPlay={true}
                  muted
                  playsInline
                  loop
                />
              </div>
            ))}
          </div>
        )}

        {/* Engagement Stats */}
        <div className="flex items-center justify-between mb-4 text-sm text-gray-500">
          <div className="flex items-center space-x-4">
            <span>{likesCount} likes</span>
            <span>{comments.length} comments</span>
            <span>{post.sharesCount || 0} shares</span>
          </div>
        </div>

        {/* Action Buttons */}
        {showActions && (
          <div className="flex items-center justify-between border-t border-gray-200 pt-4 mb-4">
            <Button
              variant="ghost"
              onClick={handleLike}
              disabled={loading}
              className={`flex-1 ${liked ? 'text-red-600' : 'text-gray-600'}`}
            >
              <Heart className={`w-5 h-5 mr-2 ${liked ? 'fill-current' : ''}`} />
              {liked ? 'Liked' : 'Like'}
            </Button>
            
            <Button
              variant="ghost"
              onClick={() => setShowComments(!showComments)}
              className="flex-1 text-gray-600"
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              Comment
            </Button>
            
            <SharePostDialog 
              postId={post.id} 
              currentUserId={userProfile?.uid || ''}
            >
              <Button
                variant="ghost"
                className="flex-1 text-gray-600"
              >
                <Share className="w-5 h-5 mr-2" />
                Share
              </Button>
            </SharePostDialog>
          </div>
        )}

        {/* Comments Section */}
        {showComments && (
          <div className="border-t border-gray-200 pt-4">
            {/* Add Comment */}
            {userProfile && (
              <div className="flex space-x-3 mb-4">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={userProfile.profilePicture} />
                  <AvatarFallback className="bg-blue-800 text-white text-sm">
                    {userProfile.fullName?.charAt(0)?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 space-y-2">
                  <Input
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write a comment..."
                    onKeyPress={(e) => e.key === 'Enter' && handleComment()}
                  />
                  {newComment.trim() && (
                    <Button
                      onClick={handleComment}
                      disabled={loading}
                      size="sm"
                      className="firegram-primary"
                    >
                      <Send className="w-3 h-3 mr-1" />
                      Post
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Comments List */}
            <div className="space-y-3">
              {comments.map((comment) => (
                <CommentItem key={comment.id} comment={comment} />
              ))}
              
              {comments.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  <MessageCircle className="w-8 h-8 mx-auto mb-2" />
                  <p>No comments yet. Be the first to comment!</p>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface CommentItemProps {
  comment: FiregramComment
}

function CommentItem({ comment }: CommentItemProps) {
  const [author, setAuthor] = useState<FiregramUser | null>(null)

  useEffect(() => {
    loadAuthor()
  }, [comment.authorId])

  const loadAuthor = async () => {
    try {
      const authorRef = ref(database, `users/${comment.authorId}`)
      const snapshot = await get(authorRef)
      
      if (snapshot.exists()) {
        setAuthor({ uid: comment.authorId, ...snapshot.val() })
      }
    } catch (error) {
      console.error('Error loading comment author:', error)
    }
  }

  if (comment.isDeleted) {
    return (
      <div className="flex space-x-3 py-2">
        <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
        <div className="flex-1">
          <p className="text-sm text-gray-500 italic">This comment was deleted</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex space-x-3">
      <Link href={`/profile/${author?.username}`}>
        <Avatar className="w-8 h-8 cursor-pointer">
          <AvatarImage src={author?.profilePicture} />
          <AvatarFallback className="bg-blue-800 text-white text-sm">
            {author?.fullName?.charAt(0)?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </Link>
      
      <div className="flex-1">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-1">
            <Link href={`/profile/${author?.username}`}>
              <span className="text-sm font-medium text-gray-900 hover:text-blue-800 cursor-pointer">
                {author?.username}
              </span>
            </Link>
            
            {author?.isVerified && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                <Shield className="w-2 h-2" />
              </Badge>
            )}
          </div>
          
          <p className="text-sm text-gray-700">{comment.content}</p>
        </div>
        
        <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
          <span>{new Date(comment.createdAt).toLocaleDateString()}</span>
          <button className="hover:text-blue-600">Like</button>
          <button className="hover:text-blue-600">Reply</button>
          {comment.isEdited && <span>• edited</span>}
        </div>
      </div>
    </div>
  )
}
