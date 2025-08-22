import { NextRequest, NextResponse } from 'next/server'
import { uploadImageToCloudinary, uploadVideoToCloudinary } from '@/lib/cloudinary'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const type = formData.get('type') as string

    if (!file) {
      return new NextResponse(
        JSON.stringify({ error: 'No file provided' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    let result

    if (type === 'video') {
      result = await uploadVideoToCloudinary(file)
    } else {
      result = await uploadImageToCloudinary(file)
    }

    if (result.success) {
      return new NextResponse(
        JSON.stringify({
          success: true,
          url: result.url,
          public_id: result.public_id,
          format: result.format,
          duration: result.duration
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    } else {
      return new NextResponse(
        JSON.stringify({ error: result.error || 'Upload failed' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
  } catch (error) {
    console.error('Error uploading media:', error)
    return new NextResponse(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}