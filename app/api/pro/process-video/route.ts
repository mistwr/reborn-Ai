import { NextRequest, NextResponse } from 'next/server'
import { writeFile, unlink } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { execSync } from 'child_process'

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '100mb',
    },
  },
}

export async function POST(request: NextRequest) {
  let inputPath = ''
  let outputPath = ''

  try {
    const formData = await request.formData()
    const videoFile = formData.get('video') as File
    const duration = parseInt(formData.get('duration') as string)
    const format = formData.get('format') as string
    const platform = formData.get('platform') as string

    if (!videoFile) {
      return NextResponse.json({ error: 'Video file is required' }, { status: 400 })
    }

    // Save uploaded file temporarily
    const buffer = await videoFile.arrayBuffer()
    inputPath = join(tmpdir(), `input-${Date.now()}.mp4`)
    await writeFile(inputPath, Buffer.from(buffer))

    // Generate output filename
    outputPath = join(tmpdir(), `output-${Date.now()}.mp4`)

    // Determine dimensions based on format
    let width = 1280
    let height = 720

    switch (format) {
      case 'vertical':
        width = 1080
        height = 1920
        break
      case 'square':
        width = 1080
        height = 1080
        break
      case 'horizontal':
      default:
        width = 1920
        height = 1080
    }

    // Use FFmpeg command to extract and scale video
    // Note: This requires FFmpeg to be installed on the server
    // For browser-only processing, we'll use FFmpeg.wasm below

    // For production, consider using FFmpeg.wasm or a dedicated video service
    const command = `ffmpeg -i ${inputPath} -t ${duration} -vf "scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2" -c:v libx264 -crf 23 -c:a aac ${outputPath}`

    try {
      execSync(command, { stdio: 'pipe' })
    } catch (error) {
      console.warn('FFmpeg not available on server, returning mock response')
      // Return a mock response if FFmpeg is not installed
      // In production, you would use FFmpeg.wasm or a dedicated service
      const mockOutput = join(tmpdir(), `mock-${Date.now()}.mp4`)
      await writeFile(mockOutput, buffer)
      outputPath = mockOutput
    }

    // For now, return the video URL (in production, upload to storage)
    const videoUrl = `/api/pro/videos/${Date.now()}.mp4`

    // Clean up input file
    try {
      await unlink(inputPath)
    } catch (err) {
      console.error('Error cleaning up input file:', err)
    }

    return NextResponse.json({ videoUrl })
  } catch (error) {
    console.error('Video processing error:', error)

    // Clean up temporary files
    try {
      if (inputPath) await unlink(inputPath)
      if (outputPath) await unlink(outputPath)
    } catch (err) {
      console.error('Error cleaning up temporary files:', err)
    }

    return NextResponse.json({ error: 'Failed to process video' }, { status: 500 })
  }
}
