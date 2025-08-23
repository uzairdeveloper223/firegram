import { NextRequest, NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function POST(request: NextRequest) {
  try {
    const { type, folder = 'firegram' } = await request.json()

    if (!type || !['image', 'video'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid or missing type parameter' },
        { status: 400 }
      )
    }

    const timestamp = Math.round(new Date().getTime() / 1000)
    
    // Generate a unique public_id
    const publicId = `${folder}/${type}_${timestamp}_${Math.random().toString(36).substring(2, 15)}`

    // Parameters for the upload
    const uploadParams: any = {
      timestamp,
      public_id: publicId,
      folder,
      resource_type: type === 'video' ? 'video' : 'image',
    }

    // Add video-specific parameters
    if (type === 'video') {
      uploadParams.quality = 'auto'
      uploadParams.format = 'mp4'
      uploadParams.transformation = [
        { quality: 'auto:good' },
        { fetch_format: 'auto' }
      ]
    } else {
      uploadParams.quality = 'auto:good'
      uploadParams.fetch_format = 'auto'
    }

    // Generate the signature
    const signature = cloudinary.utils.api_sign_request(uploadParams, process.env.CLOUDINARY_API_SECRET!)

    return NextResponse.json({
      success: true,
      signature,
      timestamp,
      public_id: publicId,
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      upload_url: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/${type === 'video' ? 'video' : 'image'}/upload`,
      folder,
      resource_type: type === 'video' ? 'video' : 'image',
    })

  } catch (error) {
    console.error('Error generating upload signature:', error)
    return NextResponse.json(
      { error: 'Failed to generate upload signature' },
      { status: 500 }
    )
  }
}