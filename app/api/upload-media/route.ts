import { NextRequest, NextResponse } from 'next/server'
import { uploadImageToCloudinary, uploadVideoToCloudinary } from '@/lib/cloudinary'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const type = formData.get('type') as string

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    let result

    if (type === 'video') {
      result = await uploadVideoToCloudinary(file)
    } else {
      result = await uploadImageToCloudinary(file)
    }

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
        { error: result.error || 'Upload failed' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error uploading media:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}