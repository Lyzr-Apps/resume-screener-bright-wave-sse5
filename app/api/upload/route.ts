import { NextRequest, NextResponse } from 'next/server'

const LYZR_UPLOAD_URL = 'https://agent-prod.studio.lyzr.ai/v3/assets/upload'
const LYZR_API_KEY = process.env.LYZR_API_KEY || ''

export async function POST(request: NextRequest) {
  try {
    if (!LYZR_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          asset_ids: [],
          files: [],
          total_files: 0,
          successful_uploads: 0,
          failed_uploads: 0,
          message: 'LYZR_API_KEY not configured',
          timestamp: new Date().toISOString(),
          error: 'LYZR_API_KEY not configured on server',
        },
        { status: 500 }
      )
    }

    const formData = await request.formData()
    const files = formData.getAll('files')

    if (files.length === 0) {
      return NextResponse.json(
        {
          success: false,
          asset_ids: [],
          files: [],
          total_files: 0,
          successful_uploads: 0,
          failed_uploads: 0,
          message: 'No files provided',
          timestamp: new Date().toISOString(),
          error: 'No files provided',
        },
        { status: 400 }
      )
    }

    // Forward the request to Lyzr API
    const uploadFormData = new FormData()
    for (const file of files) {
      if (file instanceof File) {
        uploadFormData.append('files', file, file.name)
      }
    }

    const response = await fetch(LYZR_UPLOAD_URL, {
      method: 'POST',
      headers: {
        'x-api-key': LYZR_API_KEY,
      },
      body: uploadFormData,
    })

    if (response.ok) {
      const data = await response.json()
      console.log('Lyzr upload raw response:', JSON.stringify(data))

      // Handle multiple possible response formats from Lyzr upload API
      let uploadedFiles: any[] = []

      // Format 1: { results: [{ asset_id, file_name, success }] }
      if (Array.isArray(data.results) && data.results.length > 0) {
        uploadedFiles = data.results.map((r: any) => ({
          asset_id: r.asset_id || r.id || '',
          file_name: r.file_name || r.filename || r.name || '',
          success: r.success ?? true,
          error: r.error,
        }))
      }
      // Format 2: { files: [{ asset_id, ... }] }
      else if (Array.isArray(data.files) && data.files.length > 0) {
        uploadedFiles = data.files.map((r: any) => ({
          asset_id: r.asset_id || r.id || '',
          file_name: r.file_name || r.filename || r.name || '',
          success: r.success ?? true,
          error: r.error,
        }))
      }
      // Format 3: { asset_id: "single-id" } (single file response)
      else if (data.asset_id) {
        uploadedFiles = [{
          asset_id: data.asset_id,
          file_name: data.file_name || data.filename || '',
          success: true,
        }]
      }
      // Format 4: { id: "single-id" }
      else if (data.id) {
        uploadedFiles = [{
          asset_id: data.id,
          file_name: data.file_name || data.filename || '',
          success: true,
        }]
      }
      // Format 5: Array at top level [{ asset_id, ... }]
      else if (Array.isArray(data) && data.length > 0) {
        uploadedFiles = data.map((r: any) => ({
          asset_id: r.asset_id || r.id || '',
          file_name: r.file_name || r.filename || r.name || '',
          success: r.success ?? true,
          error: r.error,
        }))
      }

      const assetIds = uploadedFiles
        .filter((f: any) => f.success && f.asset_id)
        .map((f: any) => f.asset_id)

      console.log('Extracted asset_ids:', assetIds)

      return NextResponse.json({
        success: assetIds.length > 0,
        asset_ids: assetIds,
        files: uploadedFiles,
        total_files: data.total_files || files.length,
        successful_uploads: data.successful_uploads || assetIds.length,
        failed_uploads: data.failed_uploads || (assetIds.length === 0 ? files.length : 0),
        message: assetIds.length > 0 ? `Successfully uploaded ${assetIds.length} file(s)` : 'Upload succeeded but no asset IDs returned',
        timestamp: new Date().toISOString(),
        raw_response: data,
      })
    } else {
      const errorText = await response.text()
      console.error('Upload API error:', response.status, errorText)

      return NextResponse.json(
        {
          success: false,
          asset_ids: [],
          files: [],
          total_files: files.length,
          successful_uploads: 0,
          failed_uploads: files.length,
          message: `Upload failed with status ${response.status}`,
          timestamp: new Date().toISOString(),
          error: errorText,
        },
        { status: response.status }
      )
    }
  } catch (error) {
    console.error('File upload error:', error)

    return NextResponse.json(
      {
        success: false,
        asset_ids: [],
        files: [],
        total_files: 0,
        successful_uploads: 0,
        failed_uploads: 0,
        message: 'Server error during upload',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
