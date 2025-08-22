import 'server-only'
import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary'

// Configure Cloudinary
cloudinary.config({
  cloud_name: "dyuu73uy2",
  api_key: "892128784945623",
  api_secret: "yUBvvigb_WcTX-0n3YUEBNwJUQE",
})

export interface CloudinaryUploadResult {
  success: boolean
  url?: string
  public_id?: string
  error?: string
  duration?: number
  format?: string
}

// Upload image to Cloudinary
export const uploadImageToCloudinary = async (file: File): Promise<CloudinaryUploadResult> => {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          resource_type: "image",
          folder: "firegram/images",
          transformation: [
            { width: 1080, crop: "limit" }
          ]
        },
        (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
          if (error) {
            reject({ success: false, error: error.message })
          } else if (result) {
            resolve({
              success: true,
              url: result.secure_url,
              public_id: result.public_id,
              format: result.format
            })
          } else {
            reject({ success: false, error: "Unknown error occurred" })
          }
        }
      ).end(buffer)
    })
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Upload video to Cloudinary
export const uploadVideoToCloudinary = async (file: File): Promise<CloudinaryUploadResult> => {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          resource_type: "video",
          folder: "firegram/videos",
          chunk_size: 6000000, // 6MB chunks
          eager: [
            { streaming_profile: "hd", format: "mp4" }
          ],
          eager_async: true
        },
        (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
          if (error) {
            reject({ success: false, error: error.message })
          } else if (result) {
            resolve({
              success: true,
              url: result.secure_url,
              public_id: result.public_id,
              duration: result.duration,
              format: result.format
            })
          } else {
            reject({ success: false, error: "Unknown error occurred" })
          }
        }
      ).end(buffer)
    })
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Upload media (image or video) to Cloudinary
export const uploadMediaToCloudinary = async (file: File): Promise<CloudinaryUploadResult> => {
  if (file.type.startsWith('image/')) {
    return uploadImageToCloudinary(file)
  } else if (file.type.startsWith('video/')) {
    return uploadVideoToCloudinary(file)
  } else {
    return { success: false, error: "Unsupported file type" }
  }
}