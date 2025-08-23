import { NextRequest, NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'

// Configure Cloudinary
cloudinary.config({
  cloud_name: "dyuu73uy2",
  api_key: "892128784945623",
  api_secret: "yUBvvigb_WcTX-0n3YUEBNwJUQE",
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const folder = searchParams.get('folder') || ''
    const resourceType = searchParams.get('type') || 'image'
    const maxResults = parseInt(searchParams.get('max_results') || '30')
    const nextCursor = searchParams.get('next_cursor') || undefined

    // Get resources from Cloudinary
    const result = await cloudinary.search
      .expression(folder ? `folder:${folder}/*` : 'resource_type:' + resourceType)
      .sort_by('created_at', 'desc')
      .max_results(maxResults)
      .next_cursor(nextCursor)
      .execute()

    // Get folders in the current directory
    const foldersResult = await cloudinary.api.sub_folders(folder || 'firegram')

    return NextResponse.json({
      success: true,
      resources: result.resources,
      folders: foldersResult.folders,
      next_cursor: result.next_cursor,
      total_count: result.total_count
    })

  } catch (error: any) {
    console.error('Error fetching Cloudinary resources:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch resources' 
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const publicId = searchParams.get('public_id')
    const resourceType = searchParams.get('resource_type') || 'image'

    if (!publicId) {
      return NextResponse.json(
        { success: false, error: 'Public ID is required' },
        { status: 400 }
      )
    }

    // Delete resource from Cloudinary
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType as any
    })

    return NextResponse.json({
      success: true,
      result
    })

  } catch (error: any) {
    console.error('Error deleting Cloudinary resource:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to delete resource' 
      },
      { status: 500 }
    )
  }
}