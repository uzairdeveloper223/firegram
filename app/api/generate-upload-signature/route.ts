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

    // Parameters to sign (EXCLUDE: file, cloud_name, resource_type, api_key)
    // Include ONLY the parameters that will be sent in the upload request
    const paramsToSign: Record<string, string | number> = {
      folder,
      public_id: publicId,
      timestamp, // Always required
    }

    // Add type-specific parameters that will be sent by client
    if (type === 'video') {
      paramsToSign.format = 'mp4'
      paramsToSign.quality = 'auto'
    } else {
      paramsToSign.fetch_format = 'auto'
      paramsToSign.quality = 'auto:good'
    }

    // Follow Cloudinary docs exactly:
    // 1. Sort parameters alphabetically by key
    // 2. Join as key=value pairs with &
    // 3. Append API secret
    // 4. Hash with SHA-1
    const stringToSign = Object.keys(paramsToSign)
      .sort()
      .map(key => `${key}=${paramsToSign[key]}`)
      .join('&') + "yUBvvigb_WcTX-0n3YUEBNwJUQE"

    const signature = crypto
      .createHash('sha1')
      .update(stringToSign)
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
      // Return signed params for client reference
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