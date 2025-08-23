import { NextRequest, NextResponse } from 'next/server'
import { uploadToCloudinary } from '@/lib/cloudinary-upload'

// Import the same uploadSessions from init route (in production, use shared storage)
const uploadSessions = new Map<string, {
  uploadId: string
  filename: string
  fileSize: number
  totalChunks: number
  type: 'image' | 'video'
  duration?: number
  chunks: Buffer[]
  createdAt: number
}>()

export async function POST(request: NextRequest) {
  try {
    const { uploadId, filename, type, duration } = await request.json()

    if (!uploadId || !filename || !type) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // Get upload session
    const session = uploadSessions.get(uploadId)
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Upload session not found' },
        { status: 404 }
      )
    }

    // Check if all chunks are received
    const missingChunks = session.chunks.findIndex(chunk => chunk === null)
    if (missingChunks !== -1) {
      return NextResponse.json(
        { success: false, error: `Missing chunk at index ${missingChunks}` },
        { status: 400 }
      )
    }

    // Combine all chunks into a single buffer
    const combinedBuffer = Buffer.concat(session.chunks)

    // Verify file size
    if (combinedBuffer.length !== session.fileSize) {
      return NextResponse.json(
        { success: false, error: 'File size mismatch after combining chunks' },
        { status: 400 }
      )
    }

    // Create a File-like object from the buffer
    const reconstructedFile = new File([combinedBuffer], filename, {
      type: type === 'video' ? 'video/mp4' : 'image/jpeg'
    })

    // Upload to Cloudinary
    const uploadResult = await uploadToCloudinary(reconstructedFile, type)

    // Clean up session
    uploadSessions.delete(uploadId)

    if (uploadResult.success) {
      return NextResponse.json({
        success: true,
        url: uploadResult.url,
        public_id: uploadResult.public_id,
        format: uploadResult.format,
        duration: duration || uploadResult.duration // Use client-detected duration if available
      })
    } else {
      return NextResponse.json(
        { success: false, error: uploadResult.error },
        { status: 500 }
      )
    }

  } catch (error: any) {
    console.error('Error finalizing chunked upload:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to finalize upload' },
      { status: 500 }
    )
  }
}