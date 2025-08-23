import { NextRequest, NextResponse } from 'next/server'
import { uploadToCloudinary } from '@/lib/cloudinary-upload'
import { getUploadSession, getCombinedChunks, deleteUploadSession, areAllChunksReceived } from '@/lib/firebase-upload-sessions'

export async function POST(request: NextRequest) {
  try {
    const { uploadId, filename, type, duration } = await request.json()

    if (!uploadId || !filename || !type) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // Get upload session from database
    const session = await getUploadSession(uploadId)
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Upload session not found' },
        { status: 404 }
      )
    }

    // Check if all chunks are received
    const allChunksReceived = await areAllChunksReceived(uploadId)
    if (!allChunksReceived) {
      return NextResponse.json(
        { success: false, error: 'Not all chunks have been received' },
        { status: 400 }
      )
    }

    // Get combined chunks from database
    const combinedBuffer = await getCombinedChunks(uploadId)
    if (!combinedBuffer) {
      return NextResponse.json(
        { success: false, error: 'Failed to retrieve chunks' },
        { status: 500 }
      )
    }

    // Verify file size
    if (combinedBuffer.length !== session.fileSize) {
      return NextResponse.json(
        { success: false, error: 'File size mismatch after combining chunks' },
        { status: 400 }
      )
    }

    // Create a File-like object from the buffer
    const uint8Array = new Uint8Array(combinedBuffer)
    const reconstructedFile = new File([uint8Array], filename, {
      type: type === 'video' ? 'video/mp4' : 'image/jpeg'
    })

    // Upload to Cloudinary
    const uploadResult = await uploadToCloudinary(reconstructedFile, type)

    // Clean up session from database
    await deleteUploadSession(uploadId)

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