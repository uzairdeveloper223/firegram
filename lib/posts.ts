"use client"

import { ref, push, set, get, query, orderByChild, equalTo, remove } from 'firebase/database'
import { database } from './firebase'
import { FiregramPost } from './types'
import { uploadToImgBB } from './imgbb'

export interface CreatePostData {
  content: string
  images: File[] | string[]
  videos?: File[] | string[]
  privacy: 'public' | 'followers' | 'private'
  mentions?: string[]
  scheduledFor?: number
  isFeatured?: boolean
}

export interface PostResult {
  success: boolean
  error?: string
  postId?: string
}

// Create a new post
export const createPost = async (
  authorId: string,
  data: CreatePostData
): Promise<PostResult> => {
  try {
    // Upload images to ImgBB or use provided URLs
    const imageUrls: string[] = []
    for (const image of data.images) {
      if (typeof image === 'string') {
        // Already a URL, use as is
        imageUrls.push(image)
      } else {
        // Upload File to ImgBB
        const result = await uploadToImgBB(image)
        if (result.success && result.url) {
          imageUrls.push(result.url)
        } else {
          return { success: false, error: 'Failed to upload images' }
        }
      }
    }
    
    // Upload videos to Cloudinary or use provided URLs
    let videoUrls: string[] = []
    if (data.videos) {
      for (const video of data.videos) {
        if (typeof video === 'string') {
          // Already a URL, use as is
          videoUrls.push(video)
        } else {
          // Upload File to Cloudinary
          const result = await uploadToImgBB(video) // For now, we'll use ImgBB for videos too
          if (result.success && result.url) {
            videoUrls.push(result.url)
          } else {
            return { success: false, error: 'Failed to upload videos' }
          }
        }
      }
    }

    // Create post object (removing undefined values for Firebase)
    const post: Omit<FiregramPost, 'id'> = {
      authorId,
      content: data.content,
      images: imageUrls,
      ...(videoUrls.length > 0 && { videos: videoUrls }), // Only add videos if there are any
      createdAt: Date.now(),
      privacy: data.privacy,
      isPinned: false,
      isEdited: false,
      likesCount: 0,
      commentsCount: 0,
      sharesCount: 0,
      mentions: data.mentions || [],
      isFeatured: data.isFeatured || false
    }

    // Only add scheduledFor if it exists
    if (data.scheduledFor) {
      post.scheduledFor = data.scheduledFor
    }

    // Add post to database
    const postsRef = ref(database, 'posts')
    const newPostRef = push(postsRef)
    await set(newPostRef, post)

    // Update user's post count
    const userRef = ref(database, `users/${authorId}`)
    const userSnapshot = await get(userRef)
    if (userSnapshot.exists()) {
      const userData = userSnapshot.val()
      await set(ref(database, `users/${authorId}/postsCount`), (userData.postsCount || 0) + 1)
    }

    return { success: true, postId: newPostRef.key || undefined }
  } catch (error: any) {
    console.error('Error creating post:', error)
    return { success: false, error: error.message }
  }
}

// Get user's posts
export const getUserPosts = async (userId: string): Promise<FiregramPost[]> => {
  try {
    const postsRef = ref(database, 'posts')
    const userPostsQuery = query(postsRef, orderByChild('authorId'), equalTo(userId))
    const snapshot = await get(userPostsQuery)

    if (snapshot.exists()) {
      const postsData = snapshot.val()
      return Object.keys(postsData)
        .map(key => ({ id: key, ...postsData[key] }))
        .sort((a, b) => b.createdAt - a.createdAt)
    }

    return []
  } catch (error) {
    console.error('Error fetching user posts:', error)
    return []
  }
}

// Get single post
export const getPost = async (postId: string): Promise<FiregramPost | null> => {
  try {
    const postRef = ref(database, `posts/${postId}`)
    const snapshot = await get(postRef)

    if (snapshot.exists()) {
      return { id: postId, ...snapshot.val() }
    }

    return null
  } catch (error) {
    console.error('Error fetching post:', error)
    return null
  }
}

// Pin/Unpin post
export const togglePinPost = async (
  postId: string, 
  authorId: string, 
  isPinned: boolean
): Promise<PostResult> => {
  try {
    // Check if user can pin more posts
    if (!isPinned) {
      const userPosts = await getUserPosts(authorId)
      const pinnedPosts = userPosts.filter(post => post.isPinned)
      
      // Check user's pin limit (1 for normal users, unlimited for advanced)
      const userRef = ref(database, `users/${authorId}`)
      const userSnapshot = await get(userRef)
      const userData = userSnapshot.val()
      
      if (!userData.isAdvancedUser && pinnedPosts.length >= 1) {
        return { success: false, error: 'Normal users can only pin 1 post. Upgrade to Advanced User for unlimited pins.' }
      }
    }

    await set(ref(database, `posts/${postId}/isPinned`), !isPinned)
    await set(ref(database, `posts/${postId}/updatedAt`), Date.now())

    return { success: true }
  } catch (error: any) {
    console.error('Error toggling pin:', error)
    return { success: false, error: error.message }
  }
}

// Delete post
export const deletePost = async (postId: string, authorId: string): Promise<PostResult> => {
  try {
    await remove(ref(database, `posts/${postId}`))

    // Update user's post count
    const userRef = ref(database, `users/${authorId}`)
    const userSnapshot = await get(userRef)
    if (userSnapshot.exists()) {
      const userData = userSnapshot.val()
      await set(ref(database, `users/${authorId}/postsCount`), Math.max(0, (userData.postsCount || 0) - 1))
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error deleting post:', error)
    return { success: false, error: error.message }
  }
}

// Like/Unlike post
export const toggleLikePost = async (
  postId: string, 
  userId: string
): Promise<PostResult> => {
  try {
    const likeRef = ref(database, `likes/${postId}/${userId}`)
    const likeSnapshot = await get(likeRef)

    if (likeSnapshot.exists()) {
      // Unlike
      await remove(likeRef)
      
      // Update post like count
      const postRef = ref(database, `posts/${postId}`)
      const postSnapshot = await get(postRef)
      if (postSnapshot.exists()) {
        const postData = postSnapshot.val()
        await set(ref(database, `posts/${postId}/likesCount`), Math.max(0, (postData.likesCount || 0) - 1))
      }
    } else {
      // Like
      await set(likeRef, { createdAt: Date.now() })
      
      // Update post like count
      const postRef = ref(database, `posts/${postId}`)
      const postSnapshot = await get(postRef)
      if (postSnapshot.exists()) {
        const postData = postSnapshot.val()
        await set(ref(database, `posts/${postId}/likesCount`), (postData.likesCount || 0) + 1)
      }
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error toggling like:', error)
    return { success: false, error: error.message }
  }
}

// Check if user liked post
export const checkUserLikedPost = async (postId: string, userId: string): Promise<boolean> => {
  try {
    const likeRef = ref(database, `likes/${postId}/${userId}`)
    const snapshot = await get(likeRef)
    return snapshot.exists()
  } catch (error) {
    console.error('Error checking like status:', error)
    return false
  }
}

// Extract mentions from content
export const extractMentions = (content: string): string[] => {
  const mentionRegex = /@([a-z0-9._]+)/g
  const mentions: string[] = []
  let match

  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[1])
  }

  return [...new Set(mentions)] // Remove duplicates
}

// Image processing utilities
export const processImage = (file: File): Promise<File> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      // Resize if needed (max 1080px width)
      const maxWidth = 1080
      const maxHeight = 1080
      
      let { width, height } = img
      
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height)
        width *= ratio
        height *= ratio
      }

      canvas.width = width
      canvas.height = height
      
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height)
        
        canvas.toBlob((blob) => {
          if (blob) {
            const processedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            })
            resolve(processedFile)
          } else {
            resolve(file)
          }
        }, 'image/jpeg', 0.9)
      } else {
        resolve(file)
      }
    }

    img.src = URL.createObjectURL(file)
  })
}
