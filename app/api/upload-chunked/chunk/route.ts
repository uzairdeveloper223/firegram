import { NextRequest, NextResponse } from 'next/server'
import { getUploadSession, storeChunk } from '@/lib/firebase-upload-sessions'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const chunk = formData.get('chunk') as File
    const uploadId = formData.get('uploadId') as string
    const chunkIndex = parseInt(formData.get('chunkIndex') as string)
    const totalChunks = parseInt(formData.get('totalChunks') as string)

    if (!chunk || !uploadId || isNaN(chunkIndex) || isNaN(totalChunks)) {
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

    // Validate chunk index
    if (chunkIndex < 0 || chunkIndex >= totalChunks) {
      return NextResponse.json(
        { success: false, error: 'Invalid chunk index' },
        { status: 400 }
      )
    }

    // Convert chunk to buffer
    const arrayBuffer = await chunk.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Store chunk in database
    await storeChunk(uploadId, chunkIndex, buffer)

    return NextResponse.json({
      success: true,
      chunkIndex,
      received: true
    })

  } catch (error: any) {
    console.error('Error uploading chunk:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to upload chunk' },
      { status: 500 }
    )
  }
}