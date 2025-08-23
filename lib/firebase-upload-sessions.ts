import admin from './firebase-admin'
import { getDatabase } from 'firebase-admin/database'

export interface ChunkData {
  [chunkIndex: number]: string // base64 encoded chunk data
}

export interface UploadSessionData {
  uploadId: string
  filename: string
  fileSize: number
  totalChunks: number
  type: 'image' | 'video'
  duration?: number
  chunksReceived: number[]
  chunkData: ChunkData
  createdAt: number
  updatedAt: number
}

// Get Firebase Realtime Database instance
const getDB = () => getDatabase(admin.app())

// Create a new upload session
export async function createUploadSession(data: {
  uploadId: string
  filename: string
  fileSize: number
  totalChunks: number
  type: 'image' | 'video'
  duration?: number
}): Promise<UploadSessionData> {
  const db = getDB()
  const now = Date.now()
  
  const sessionData: UploadSessionData = {
    uploadId: data.uploadId,
    filename: data.filename,
    fileSize: data.fileSize,
    totalChunks: data.totalChunks,
    type: data.type,
    duration: data.duration,
    chunksReceived: [],
    chunkData: {},
    createdAt: now,
    updatedAt: now,
  }

  // Store in Firebase Realtime Database under /upload-sessions/{uploadId}
  await db.ref(`upload-sessions/${data.uploadId}`).set(sessionData)
  
  return sessionData
}

// Get upload session by uploadId
export async function getUploadSession(uploadId: string): Promise<UploadSessionData | null> {
  const db = getDB()
  const snapshot = await db.ref(`upload-sessions/${uploadId}`).once('value')
  
  if (!snapshot.exists()) {
    return null
  }
  
  return snapshot.val() as UploadSessionData
}

// Store a chunk for an upload session
export async function storeChunk(
  uploadId: string,
  chunkIndex: number,
  chunkBuffer: Buffer
): Promise<void> {
  const db = getDB()
  const sessionRef = db.ref(`upload-sessions/${uploadId}`)
  
  // Get current session data
  const snapshot = await sessionRef.once('value')
  if (!snapshot.exists()) {
    throw new Error('Upload session not found')
  }
  
  const session = snapshot.val() as UploadSessionData
  
  // Convert buffer to base64 for storage
  const base64Data = chunkBuffer.toString('base64')
  
  // Update chunks received and chunk data
  const chunksReceived = Array.isArray(session.chunksReceived) 
    ? [...session.chunksReceived] 
    : []
  
  if (!chunksReceived.includes(chunkIndex)) {
    chunksReceived.push(chunkIndex)
  }

  const chunkData = session.chunkData || {}
  chunkData[chunkIndex] = base64Data

  // Update the session with new chunk data
  await sessionRef.update({
    chunksReceived,
    chunkData,
    updatedAt: Date.now(),
  })
}

// Get all chunks for an upload session and combine them
export async function getCombinedChunks(uploadId: string): Promise<Buffer | null> {
  const session = await getUploadSession(uploadId)
  if (!session) {
    return null
  }

  const chunkData = session.chunkData || {}
  const chunksReceived = Array.isArray(session.chunksReceived) 
    ? session.chunksReceived 
    : []

  // Check if all chunks are received
  const expectedChunks = Array.from({ length: session.totalChunks }, (_, i) => i)
  const missingChunks = expectedChunks.filter(i => !chunksReceived.includes(i))
  
  if (missingChunks.length > 0) {
    throw new Error(`Missing chunks: ${missingChunks.join(', ')}`)
  }

  // Combine chunks in order
  const buffers: Buffer[] = []
  for (let i = 0; i < session.totalChunks; i++) {
    const base64Data = chunkData[i]
    if (!base64Data) {
      throw new Error(`Missing chunk data for index ${i}`)
    }
    buffers.push(Buffer.from(base64Data, 'base64'))
  }

  return Buffer.concat(buffers)
}

// Delete upload session
export async function deleteUploadSession(uploadId: string): Promise<void> {
  const db = getDB()
  await db.ref(`upload-sessions/${uploadId}`).remove()
}

// Clean up old sessions (older than 1 hour)
export async function cleanupOldSessions(): Promise<void> {
  const db = getDB()
  const oneHourAgo = Date.now() - (60 * 60 * 1000)
  
  // Get all sessions
  const snapshot = await db.ref('upload-sessions').once('value')
  if (!snapshot.exists()) {
    return
  }
  
  const sessions = snapshot.val() as { [key: string]: UploadSessionData }
  const updates: { [key: string]: null } = {}
  
  // Mark old sessions for deletion
  Object.entries(sessions).forEach(([uploadId, session]) => {
    if (session.createdAt < oneHourAgo) {
      updates[`upload-sessions/${uploadId}`] = null
    }
  })
  
  // Batch delete old sessions
  if (Object.keys(updates).length > 0) {
    await db.ref().update(updates)
  }
}

// Check if all chunks are received for a session
export async function areAllChunksReceived(uploadId: string): Promise<boolean> {
  const session = await getUploadSession(uploadId)
  if (!session) {
    return false
  }

  const chunksReceived = Array.isArray(session.chunksReceived) 
    ? session.chunksReceived 
    : []

  return chunksReceived.length === session.totalChunks
}