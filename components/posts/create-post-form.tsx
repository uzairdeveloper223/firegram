"use client"

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { FiregramUser } from '@/lib/types'
import { createPost, extractMentions, processImage } from '@/lib/posts'
import { uploadMediaToCloudinary } from '@/lib/cloudinary'
import { getUserVideoUsage, formatTime, addVideoUsage } from '@/lib/video-usage'
import {
  ImagePlus,
  X,
  Send,
  Users,
  Lock,
  Globe,
  RotateCcw,
  Crop,
  Palette,
  Zap,
  Video,
  Play,
  Info
} from 'lucide-react'

interface CreatePostFormProps {
  user: FiregramUser
}

interface MediaItem {
  file: File
  preview: string
  type: 'image' | 'video'
  edit?: {
    rotation: number
    filter: string
  }
  duration?: number // For videos
}

const IMAGE_FILTERS = [
  { name: 'Normal', value: 'none', css: 'filter: none' },
  { name: 'Bright', value: 'brightness', css: 'filter: brightness(1.2)' },
  { name: 'Contrast', value: 'contrast', css: 'filter: contrast(1.3)' },
  { name: 'Sepia', value: 'sepia', css: 'filter: sepia(0.6)' },
  { name: 'Grayscale', value: 'grayscale', css: 'filter: grayscale(1)' },
  { name: 'Vintage', value: 'vintage', css: 'filter: sepia(0.5) contrast(1.2) brightness(1.1)' },
]

export function CreatePostForm({ user }: CreatePostFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [content, setContent] = useState('')
  const [privacy, setPrivacy] = useState<'public' | 'followers' | 'private'>('public')
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([])
  const [videoUsage, setVideoUsage] = useState<{
    totalDuration: number;
    monthlyUsage: number;
    limit: number;
    remaining: number;
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [mentions, setMentions] = useState<string[]>([])
  const [editingMediaIndex, setEditingMediaIndex] = useState<number | null>(null)
  const [isFeatured, setIsFeatured] = useState(false)

  // Fetch user's video usage
  useEffect(() => {
    const fetchVideoUsage = async () => {
      try {
        const usage = await getUserVideoUsage(user.uid)
        setVideoUsage(usage)
      } catch (error) {
        console.error('Error fetching video usage:', error)
      }
    }

    fetchVideoUsage()
  }, [user.uid])

  const handleMediaUpload = (files: FileList | null) => {
    if (!files) return

    const newMediaItems: MediaItem[] = []
    const maxItems = 10 - mediaItems.length // Max 10 media items

    Array.from(files).slice(0, maxItems).forEach(file => {
      if (file.type.startsWith('image/')) {
        const preview = URL.createObjectURL(file)
        newMediaItems.push({
          file,
          preview,
          type: 'image',
          edit: { rotation: 0, filter: 'none' }
        })
      } else if (file.type.startsWith('video/')) {
        const preview = URL.createObjectURL(file)
        newMediaItems.push({
          file,
          preview,
          type: 'video'
        })
      }
    })

    setMediaItems(prev => [...prev, ...newMediaItems])
  }

  const removeMedia = (index: number) => {
    URL.revokeObjectURL(mediaItems[index].preview)
    setMediaItems(prev => prev.filter((_, i) => i !== index))
  }

  const rotateImage = (index: number) => {
    setMediaItems(prev => {
      const newItems = [...prev]
      if (newItems[index].type === 'image' && newItems[index].edit) {
        newItems[index] = {
          ...newItems[index],
          edit: {
            ...newItems[index].edit!,
            rotation: (newItems[index].edit!.rotation + 90) % 360
          }
        }
      }
      return newItems
    })
  }

  const applyFilter = (index: number, filter: string) => {
    setMediaItems(prev => {
      const newItems = [...prev]
      if (newItems[index].type === 'image' && newItems[index].edit) {
        newItems[index] = {
          ...newItems[index],
          edit: {
            ...newItems[index].edit!,
            filter
          }
        }
      }
      return newItems
    })
  }

  const handleContentChange = (value: string) => {
    setContent(value)
    const extractedMentions = extractMentions(value)
    setMentions(extractedMentions)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!content.trim() && mediaItems.length === 0) {
      toast({
        title: "Content Required",
        description: "Please add some content or media to your post.",
        variant: "destructive"
      })
      return
    }

    setLoading(true)

    try {
      // Process media items (images and videos) with Cloudinary
      const mediaUrls: string[] = []
      
      for (let i = 0; i < mediaItems.length; i++) {
        const mediaItem = mediaItems[i]
        
        // Upload to Cloudinary
        const result = await uploadMediaToCloudinary(mediaItem.file)
        
        if (result.success && result.url) {
          mediaUrls.push(result.url)
        } else {
          throw new Error(result.error || "Failed to upload media")
        }
      }

      // Separate images and videos
      const imageUrls: string[] = []
      const videoUrls: string[] = []
      const videoDurations: number[] = [] // Track video durations
      
      mediaItems.forEach((item, index) => {
        if (item.type === 'image') {
          imageUrls.push(mediaUrls[index])
        } else {
          videoUrls.push(mediaUrls[index])
          // For now, we'll use a placeholder duration
          // In a real implementation, you would get the actual duration from the video file
          videoDurations.push(10) // Placeholder for 10 seconds
        }
      })

      // Check video usage limits
      if (videoDurations.length > 0 && videoUsage) {
        const totalVideoDuration = videoDurations.reduce((sum, duration) => sum + duration, 0)
        
        if (totalVideoDuration > videoUsage.remaining) {
          toast({
            title: "Video limit exceeded",
            description: "You have exceeded your video upload limit. Please remove some videos or upgrade your account.",
            variant: "destructive"
          })
          setLoading(false)
          return
        }
      }

      const result = await createPost(user.uid, {
        content: content.trim(),
        images: imageUrls,
        ...(videoUrls.length > 0 && { videos: videoUrls }),
        privacy,
        mentions,
        isFeatured: user.isAdvancedUser ? isFeatured : false
      })

      // Update video usage if videos were uploaded
      if (videoUrls.length > 0 && videoDurations.length > 0) {
        const totalVideoDuration = videoDurations.reduce((sum, duration) => sum + duration, 0)
        await addVideoUsage(user.uid, totalVideoDuration)
      }

      if (result.success) {
        toast({
          title: "Post Created!",
          description: "Your post has been shared successfully."
        })
        
        // Clean up previews
        mediaItems.forEach(item => URL.revokeObjectURL(item.preview))
        
        // Redirect to profile or post
        if (result.postId) {
          router.push(`/post/${result.postId}`)
        } else {
          router.push(`/profile/${user.username}`)
        }
      } else {
        toast({
          title: "Failed to create post",
          description: result.error || "Please try again.",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error creating post:', error)
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const getFilterStyle = (filter: string): React.CSSProperties => {
    const filterObj = IMAGE_FILTERS.find(f => f.value === filter)
    const filterValue = filterObj?.value || 'none'
    
    switch (filterValue) {
      case 'brightness':
        return { filter: 'brightness(1.2)' }
      case 'contrast':
        return { filter: 'contrast(1.3)' }
      case 'sepia':
        return { filter: 'sepia(0.6)' }
      case 'grayscale':
        return { filter: 'grayscale(1)' }
      case 'vintage':
        return { filter: 'sepia(0.5) contrast(1.2) brightness(1.1)' }
      default:
        return { filter: 'none' }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Content */}
      <div>
        <Label htmlFor="content">What's on your mind?</Label>
        <Textarea
          id="content"
          placeholder="Share your thoughts, experiences, or anything interesting..."
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          className="min-h-32 mt-2"
          maxLength={2000}
        />
        <div className="flex justify-between items-center mt-2">
          <div className="text-sm text-gray-500">
            {content.length}/2000 characters
          </div>
          {mentions.length > 0 && (
            <div className="flex items-center space-x-1">
              <span className="text-sm text-gray-500">Mentions:</span>
              {mentions.map(mention => (
                <Badge key={mention} variant="outline" className="text-blue-600">
                  @{mention}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Video Usage */}
      {videoUsage && (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-blue-800">Video Usage</h3>
            <Info className="w-4 h-4 text-blue-600" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Used: {formatTime(videoUsage.monthlyUsage)}</span>
              <span>Limit: {formatTime(videoUsage.limit)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{ width: `${Math.min(100, (videoUsage.monthlyUsage / videoUsage.limit) * 100)}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-600">
              {formatTime(videoUsage.remaining)} remaining
            </p>
          </div>
        </div>
      )}

      {/* Images */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <Label>Media ({mediaItems.length}/10)</Label>
          <div className="flex space-x-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={mediaItems.length >= 10}
            >
              <ImagePlus className="w-4 h-4 mr-2" />
              Add Media
            </Button>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={(e) => handleMediaUpload(e.target.files)}
        />

        {/* Media Previews */}
        {mediaItems.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {mediaItems.map((mediaItem, index) => (
              <div key={index} className="relative group">
                <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                  {mediaItem.type === 'image' ? (
                    <img
                      src={mediaItem.preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-full object-cover transition-transform"
                      style={{
                        transform: `rotate(${mediaItem.edit?.rotation || 0}deg)`,
                        ...getFilterStyle(mediaItem.edit?.filter || 'none')
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-black relative">
                      <video
                        src={mediaItem.preview}
                        className="w-full h-full object-cover"
                        muted
                        playsInline
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Play className="w-12 h-12 text-white opacity-80" />
                      </div>
                      <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                        Video
                      </div>
                    </div>
                  )}
                </div>

                {/* Media Controls */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all rounded-lg">
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeMedia(index)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>

                  {mediaItem.type === 'image' && (
                    <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => rotateImage(index)}
                      >
                        <RotateCcw className="w-3 h-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setEditingMediaIndex(editingMediaIndex === index ? null : index)}
                      >
                        <Palette className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Filter Selector for images */}
                {mediaItem.type === 'image' && editingMediaIndex === index && (
                  <div className="absolute -bottom-12 left-0 right-0 bg-white border rounded-lg p-2 shadow-lg z-10">
                    <div className="flex space-x-1 overflow-x-auto">
                      {IMAGE_FILTERS.map(filter => (
                        <Button
                          key={filter.value}
                          type="button"
                          variant={mediaItem.edit?.filter === filter.value ? "default" : "outline"}
                          size="sm"
                          onClick={() => applyFilter(index, filter.value)}
                          className="whitespace-nowrap"
                        >
                          {filter.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* Privacy Settings */}
      <div>
        <Label>Who can see this post?</Label>
        <Select value={privacy} onValueChange={(value: any) => setPrivacy(value)}>
          <SelectTrigger className="mt-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="public">
              <div className="flex items-center space-x-2">
                <Globe className="w-4 h-4" />
                <span>Public - Anyone can see this post</span>
              </div>
            </SelectItem>
            <SelectItem value="followers">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4" />
                <span>Followers Only</span>
              </div>
            </SelectItem>
            <SelectItem value="private">
              <div className="flex items-center space-x-2">
                <Lock className="w-4 h-4" />
                <span>Private - Only you can see this</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Advanced Features */}
      {user.isAdvancedUser && (
        <div className="bg-gradient-to-r from-blue-50 to-green-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center space-x-2 mb-3">
            <Zap className="w-4 h-4 text-blue-800" />
            <span className="font-medium text-blue-800">Advanced User Features</span>
          </div>
          
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="featured"
              checked={isFeatured}
              onChange={(e) => setIsFeatured(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            />
            <Label htmlFor="featured" className="text-sm text-blue-700">
              Feature this post in the premium feed for maximum visibility
            </Label>
          </div>
        </div>
      )}

      {/* Submit */}
      <div className="flex justify-end space-x-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="firegram-primary"
          disabled={loading || (!content.trim() && mediaItems.length === 0)}
        >
          {loading ? (
            "Creating..."
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Share Post
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
