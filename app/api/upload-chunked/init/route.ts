import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

// In-memory storage for upload sessions (in production, use Redis or database)
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

// Clean up old sessions (older than 1 hour)
function cleanupOldSessions() {
  const oneHourAgo = Date.now() - (60 * 60 * 1000)
  for (const [uploadId, session] of uploadSessions.entries()) {
    if (session.createdAt < oneHourAgo) {
      uploadSessions.delete(uploadId)
    }
  }
}

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
    cleanupOldSessions()

    // Generate unique upload ID
    const uploadId = crypto.randomUUID()

    // Create upload session
    uploadSessions.set(uploadId, {
      uploadId,
      filename,
      fileSize,
      totalChunks,
      type,
      duration,
      chunks: new Array(totalChunks).fill(null),
      createdAt: Date.now()
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