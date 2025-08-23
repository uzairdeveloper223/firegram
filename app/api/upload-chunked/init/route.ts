import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createUploadSession, cleanupOldSessions } from '@/lib/firebase-upload-sessions'

export async function POST(request: NextRequest) {
  try {
    const { filename, fileSize, totalChunks, type, duration } = await request.json()

    if (!filename || !fileSize || !totalChunks || !type) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    if (!['image', 'video'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type' },
        { status: 400 }
      )
    }

    // Clean up old sessions
    await cleanupOldSessions()

    // Generate unique upload ID
    const uploadId = crypto.randomUUID()

    // Create upload session in database
    await createUploadSession({
      uploadId,
      filename,
      fileSize,
      totalChunks,
      type,
      duration
    })

    return NextResponse.json({
      success: true,
      uploadId
    })

  } catch (error: any) {
    console.error('Error initializing chunked upload:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to initialize upload' },
      { status: 500 }
    )
  }
}