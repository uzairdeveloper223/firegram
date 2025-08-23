import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const { type, folder = 'firegram' } = await request.json()

    if (!type || !['image', 'video'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid or missing type parameter' },
        { status: 400 }
      )
    }

    const timestamp = Math.floor(Date.now() / 1000)
    
    // Generate a unique public_id
    const publicId = `${folder}/${type}_${timestamp}_${Math.random().toString(36).substring(2, 15)}`

    // Parameters that will be sent in the upload request
    // MUST match exactly what the client sends
    const paramsToSign: Record<string, string | number> = {
      folder,
      public_id: publicId,
      timestamp,
    }

    // Add type-specific parameters that Cloudinary expects
    if (type === 'video') {
      paramsToSign.format = 'mp4'
      paramsToSign.quality = 'auto'
    } else {
      paramsToSign.fetch_format = 'auto'
      paramsToSign.quality = 'auto:good'
    }

    // Step 1: Sort parameters alphabetically by key
    const sortedKeys = Object.keys(paramsToSign).sort()
    
    // Step 2: Create string to sign
    const stringToSign = sortedKeys
      .map(key => `${key}=${paramsToSign[key]}`)
      .join('&')

    // Step 3: Append API secret and hash with SHA1
    const signature = crypto
      .createHash('sha1')
      .update(stringToSign + "yUBvvigb_WcTX-0n3YUEBNwJUQE")
      .digest('hex')

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
      // Include the parameters that were signed
      signed_params: paramsToSign
    })

  } catch (error) {
    console.error('Error generating upload signature:', error)
    return NextResponse.json(
      { error: 'Failed to generate upload signature' },
      { status: 500 }
    )
  }
}