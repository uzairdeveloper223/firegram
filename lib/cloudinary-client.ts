export interface UploadSignature {
  signature: string
  timestamp: number
  public_id: string
  cloud_name: string
  api_key: string
  upload_url: string
  folder: string
  resource_type: string
}

export interface UploadResult {
  success: boolean
  url?: string
  public_id?: string
  format?: string
  duration?: number
  error?: string
  progress?: number
}

export async function getUploadSignature(type: 'image' | 'video'): Promise<UploadSignature> {
  const response = await fetch('/api/generate-upload-signature', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ type }),
  })

  if (!response.ok) {
    throw new Error('Failed to get upload signature')
  }

  const data = await response.json()
  if (!data.success) {
    throw new Error(data.error || 'Failed to get upload signature')
  }

  return data
}

export async function uploadToCloudinaryDirect(
  file: File,
  type: 'image' | 'video',
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  try {
    // Get upload signature
    const signature = await getUploadSignature(type)

    // Create form data for Cloudinary upload
    const formData = new FormData()
    formData.append('file', file)
    formData.append('signature', signature.signature)
    formData.append('timestamp', signature.timestamp.toString())
    formData.append('public_id', signature.public_id)
    formData.append('api_key', signature.api_key)
    formData.append('folder', signature.folder)

    // Add video-specific parameters
    if (type === 'video') {
      formData.append('resource_type', 'video')
      formData.append('quality', 'auto')
      formData.append('format', 'mp4')
    } else {
      formData.append('resource_type', 'image')
      formData.append('quality', 'auto:good')
      formData.append('fetch_format', 'auto')
    }

    // Upload directly to Cloudinary with progress tracking
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()

      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = Math.round((event.loaded / event.total) * 100)
          onProgress(progress)
        }
      })

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          try {
            const result = JSON.parse(xhr.responseText)
            resolve({
              success: true,
              url: result.secure_url,
              public_id: result.public_id,
              format: result.format,
              duration: result.duration,
            })
          } catch (error) {
            reject(new Error('Failed to parse upload response'))
          }
        } else {
          try {
            const errorResult = JSON.parse(xhr.responseText)
            resolve({
              success: false,
              error: errorResult.error?.message || 'Upload failed',
            })
          } catch {
            resolve({
              success: false,
              error: `Upload failed with status ${xhr.status}`,
            })
          }
        }
      })

      xhr.addEventListener('error', () => {
        resolve({
          success: false,
          error: 'Network error during upload',
        })
      })

      xhr.addEventListener('timeout', () => {
        resolve({
          success: false,
          error: 'Upload timeout',
        })
      })

      // Set timeout for large files (10 minutes)
      xhr.timeout = 10 * 60 * 1000

      xhr.open('POST', signature.upload_url)
      xhr.send(formData)
    })

  } catch (error) {
    console.error('Error uploading to Cloudinary:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    }
  }
}

// Utility function to validate file size and type
export function validateFile(file: File, type: 'image' | 'video'): { valid: boolean; error?: string } {
  const maxSizes = {
    image: 10 * 1024 * 1024, // 10MB
    video: 100 * 1024 * 1024, // 100MB
  }

  const allowedTypes = {
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    video: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'],
  }

  if (file.size > maxSizes[type]) {
    return {
      valid: false,
      error: `File size exceeds ${maxSizes[type] / (1024 * 1024)}MB limit`,
    }
  }

  if (!allowedTypes[type].includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${allowedTypes[type].join(', ')}`,
    }
  }

  return { valid: true }
}