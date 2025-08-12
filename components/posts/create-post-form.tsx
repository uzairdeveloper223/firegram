"use client"

import { useState, useRef } from 'react'
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
  Zap
} from 'lucide-react'

interface CreatePostFormProps {
  user: FiregramUser
}

interface ImageEdit {
  rotation: number
  filter: string
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
  const [images, setImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [imageEdits, setImageEdits] = useState<ImageEdit[]>([])
  const [loading, setLoading] = useState(false)
  const [mentions, setMentions] = useState<string[]>([])
  const [editingImageIndex, setEditingImageIndex] = useState<number | null>(null)
  const [isFeatured, setIsFeatured] = useState(false)

  const handleImageUpload = (files: FileList | null) => {
    if (!files) return

    const newFiles = Array.from(files).slice(0, 10 - images.length) // Max 10 images
    const newPreviews: string[] = []
    const newEdits: ImageEdit[] = []

    newFiles.forEach(file => {
      if (file.type.startsWith('image/')) {
        const preview = URL.createObjectURL(file)
        newPreviews.push(preview)
        newEdits.push({ rotation: 0, filter: 'none' })
      }
    })

    setImages(prev => [...prev, ...newFiles])
    setImagePreviews(prev => [...prev, ...newPreviews])
    setImageEdits(prev => [...prev, ...newEdits])
  }

  const removeImage = (index: number) => {
    URL.revokeObjectURL(imagePreviews[index])
    setImages(prev => prev.filter((_, i) => i !== index))
    setImagePreviews(prev => prev.filter((_, i) => i !== index))
    setImageEdits(prev => prev.filter((_, i) => i !== index))
  }

  const rotateImage = (index: number) => {
    setImageEdits(prev => {
      const newEdits = [...prev]
      newEdits[index] = {
        ...newEdits[index],
        rotation: (newEdits[index].rotation + 90) % 360
      }
      return newEdits
    })
  }

  const applyFilter = (index: number, filter: string) => {
    setImageEdits(prev => {
      const newEdits = [...prev]
      newEdits[index] = {
        ...newEdits[index],
        filter
      }
      return newEdits
    })
  }

  const handleContentChange = (value: string) => {
    setContent(value)
    const extractedMentions = extractMentions(value)
    setMentions(extractedMentions)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!content.trim() && images.length === 0) {
      toast({
        title: "Content Required",
        description: "Please add some content or images to your post.",
        variant: "destructive"
      })
      return
    }

    setLoading(true)

    try {
      // Process images with edits
      const processedImages: File[] = []
      
      for (let i = 0; i < images.length; i++) {
        const file = images[i]
        const edit = imageEdits[i]
        
        // Apply image processing (rotation, filters, etc.)
        let processedFile = await processImage(file)
        
        // Note: For simplicity, we're not implementing client-side rotation/filtering
        // In a production app, you'd use canvas manipulation here
        processedImages.push(processedFile)
      }

      const result = await createPost(user.uid, {
        content: content.trim(),
        images: processedImages,
        privacy,
        mentions,
        isFeatured: user.isAdvancedUser ? isFeatured : false
      })

      if (result.success) {
        toast({
          title: "Post Created!",
          description: "Your post has been shared successfully."
        })
        
        // Clean up previews
        imagePreviews.forEach(URL.revokeObjectURL)
        
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

      {/* Images */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <Label>Images ({images.length}/10)</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={images.length >= 10}
          >
            <ImagePlus className="w-4 h-4 mr-2" />
            Add Images
          </Button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleImageUpload(e.target.files)}
        />

        {/* Image Previews */}
        {images.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {imagePreviews.map((preview, index) => (
              <div key={index} className="relative group">
                <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                  <img
                    src={preview}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-full object-cover transition-transform"
                    style={{
                      transform: `rotate(${imageEdits[index]?.rotation || 0}deg)`,
                      ...getFilterStyle(imageEdits[index]?.filter || 'none')
                    }}
                  />
                </div>

                {/* Image Controls */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all rounded-lg">
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeImage(index)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>

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
                      onClick={() => setEditingImageIndex(editingImageIndex === index ? null : index)}
                    >
                      <Palette className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                {/* Filter Selector */}
                {editingImageIndex === index && (
                  <div className="absolute -bottom-12 left-0 right-0 bg-white border rounded-lg p-2 shadow-lg z-10">
                    <div className="flex space-x-1 overflow-x-auto">
                      {IMAGE_FILTERS.map(filter => (
                        <Button
                          key={filter.value}
                          type="button"
                          variant={imageEdits[index]?.filter === filter.value ? "default" : "outline"}
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
          disabled={loading || (!content.trim() && images.length === 0)}
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
