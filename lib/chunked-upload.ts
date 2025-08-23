export interface ChunkedUploadResult {
  success: boolean
  url?: string
  public_id?: string
  format?: string
  duration?: number
  error?: string
}

// Get video duration from file
export function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src)
      resolve(video.duration)
    }
    
    video.onerror = () => {
      window.URL.revokeObjectURL(video.src)
      reject(new Error('Failed to load video metadata'))
    }
    
    video.src = URL.createObjectURL(file)
  })
}

// Split file into chunks
function createChunks(file: File, chunkSize: number = 4 * 1024 * 1024): Blob[] {
  const chunks: Blob[] = []
  let start = 0
  
  while (start < file.size) {
    const end = Math.min(start + chunkSize, file.size)
    chunks.push(file.slice(start, end))
    start = end
  }
  
  return chunks
}

// Upload file in chunks
export async function uploadFileInChunks(
  file: File,
  type: 'image' | 'video',
  onProgress?: (progress: number) => void
): Promise<ChunkedUploadResult> {
  try {
    // For images, use direct upload (they're usually smaller)
    if (type === 'image') {
      return await uploadSingleFile(file, type, onProgress)
    }

    // Get video duration first
    let duration: number | undefined
    try {
      duration = await getVideoDuration(file)
    } catch (error) {
      console.warn('Could not get video duration:', error)
      duration = undefined
    }

    // Split video into 4MB chunks
    const chunks = createChunks(file, 4 * 1024 * 1024)
    const totalChunks = chunks.length
    
    // If only one chunk, use direct upload
    if (totalChunks === 1) {
      const result = await uploadSingleFile(file, type, onProgress)
      return {
        ...result,
        duration: duration || result.duration
      }
    }

    // Initialize chunked upload
    const initResponse = await fetch('/api/upload-chunked/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: file.name,
        fileSize: file.size,
        totalChunks,
        type,
        duration
      })
    })

    const initResult = await initResponse.json()
    if (!initResult.success) {
      throw new Error(initResult.error || 'Failed to initialize chunked upload')
    }

    const uploadId = initResult.uploadId

    // Upload chunks sequentially
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      const formData = new FormData()
      formData.append('chunk', chunk)
      formData.append('uploadId', uploadId)
      formData.append('chunkIndex', i.toString())
      formData.append('totalChunks', totalChunks.toString())

      const chunkResponse = await fetch('/api/upload-chunked/chunk', {
        method: 'POST',
        body: formData
      })

      const chunkResult = await chunkResponse.json()
      if (!chunkResult.success) {
        throw new Error(chunkResult.error || `Failed to upload chunk ${i + 1}`)
      }

      // Update progress
      if (onProgress) {
        const progress = Math.round(((i + 1) / totalChunks) * 100)
        onProgress(progress)
      }
    }

    // Finalize upload
    const finalizeResponse = await fetch('/api/upload-chunked/finalize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uploadId,
        filename: file.name,
        type,
        duration
      })
    })

    const finalResult = await finalizeResponse.json()
    if (!finalResult.success) {
      throw new Error(finalResult.error || 'Failed to finalize upload')
    }

    return {
      success: true,
      url: finalResult.url,
      public_id: finalResult.public_id,
      format: finalResult.format,
      duration: duration || finalResult.duration
    }

  } catch (error: any) {
    console.error('Chunked upload error:', error)
    return {
      success: false,
      error: error.message || 'Upload failed'
    }
  }
}

// Fallback to single file upload for smaller files
async function uploadSingleFile(
  file: File,
  type: 'image' | 'video',
  onProgress?: (progress: number) => void
): Promise<ChunkedUploadResult> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('type', type)

  // Simulate progress for single file
  if (onProgress) {
    const progressInterval = setInterval(() => {
      onProgress(Math.min(90, Math.random() * 80 + 10))
    }, 200)

    try {
      const response = await fetch('/api/upload-media-direct', {
        method: 'POST',
        body: formData
      })

      clearInterval(progressInterval)
      onProgress(100)

      const result = await response.json()
      return result
    } catch (error) {
      clearInterval(progressInterval)
      throw error
    }
  } else {
    const response = await fetch('/api/upload-media-direct', {
      method: 'POST',
      body: formData
    })

    return await response.json()
  }
}