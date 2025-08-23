import { v2 as cloudinary } from 'cloudinary'

// Configure Cloudinary
cloudinary.config({
  cloud_name: "dyuu73uy2",
  api_key: "892128784945623",
  api_secret: "yUBvvigb_WcTX-0n3YUEBNwJUQE",
})

export interface UploadResult {
  success: boolean
  url?: string
  public_id?: string
  format?: string
  duration?: number
  error?: string
}

// Server-side upload using Cloudinary SDK
export async function uploadToCloudinary(
  file: File,
  type: 'image' | 'video'
): Promise<UploadResult> {
  try {
    // Convert File to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload options
    const uploadOptions = {
      resource_type: type as 'image' | 'video',
      folder: 'firegram',
      quality: type === 'video' ? 'auto' : 'auto:good',
      ...(type === 'video' && { 
        format: 'mp4',
        transformation: [
          { quality: 'auto:good' },
          { fetch_format: 'auto' }
        ]
      }),
      ...(type === 'image' && {
        fetch_format: 'auto',
        transformation: [
          { width: 1080, crop: 'limit' }
        ]
      })
    }

    // Upload to Cloudinary
    const result = await new Promise<any>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            reject(error)
          } else {
            resolve(result)
          }
        }
      ).end(buffer)
    })

    return {
      success: true,
      url: result.secure_url,
      public_id: result.public_id,
      format: result.format,
      duration: result.duration
    }

  } catch (error: any) {
    console.error('Cloudinary upload error:', error)
    return {
      success: false,
      error: error.message || 'Upload failed'
    }
  }
}