import { NextRequest, NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'

// Configure Cloudinary
cloudinary.config({
   cloud_name: "dyuu73uy2",
  api_key: "892128784945623",
  api_secret: "yUBvvigb_WcTX-0n3YUEBNwJUQE",
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

    // Parameters for the upload - must match exactly what the client sends
    const uploadParams: any = {
      timestamp,
      public_id: publicId,
      folder,
    }

    // Add video-specific parameters that will be sent by client
    if (type === 'video') {
      uploadParams.quality = 'auto'
      uploadParams.format = 'mp4'
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
      cloud_name: "dyuu73uy2",
      api_key: "892128784945623",
      upload_url: `https://api.cloudinary.com/v1_1/dyuu73uy2/${type === 'video' ? 'video' : 'image'}/upload`,
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