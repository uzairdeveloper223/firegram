import { NextRequest, NextResponse } from 'next/server'
import { uploadToCloudinary } from '@/lib/cloudinary-upload'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const type = formData.get('type') as 'image' | 'video'

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!type || !['image', 'video'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid type parameter' },
        { status: 400 }
      )
    }

    // Check file size limits
    const maxSizes = {
      image: 10 * 1024 * 1024, // 10MB
      video: 50 * 1024 * 1024, // 50MB for server upload
    }

    if (file.size > maxSizes[type]) {
      return NextResponse.json(
        { 
          success: false, 
          error: `File size exceeds ${maxSizes[type] / (1024 * 1024)}MB limit` 
        },
        { status: 400 }
      )
    }

    // Upload to Cloudinary using server-side SDK
    const result = await uploadToCloudinary(file, type)

    if (result.success) {
      return NextResponse.json({
        success: true,
        url: result.url,
        public_id: result.public_id,
        format: result.format,
        duration: result.duration
      })
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      )
    }

  } catch (error: any) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}