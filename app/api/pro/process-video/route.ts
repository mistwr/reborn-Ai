import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"
import { writeFile, unlink } from "fs/promises"
import { join } from "path"
import { tmpdir } from "os"
import { execSync } from "child_process"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

const ALLOWED_DURATIONS = new Set([15, 30, 60])
const ALLOWED_FORMATS = new Set(["vertical", "horizontal", "square"])
const MAX_VIDEO_BYTES = 100 * 1024 * 1024

export async function POST(request: NextRequest) {
  let inputPath = ""
  let outputPath = ""

  try {
    const session = await getServerSession(authOptions as any)
    const isPro = Boolean((session?.user as any)?.isPro)

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Authentication required", code: "AUTH_REQUIRED" }, { status: 401 })
    }

    if (!isPro) {
      return NextResponse.json({ error: "Reborn AI Pro required", code: "PRO_REQUIRED" }, { status: 403 })
    }

    const formData = await request.formData()
    const videoFile = formData.get("video") as File | null
    const duration = Number.parseInt(String(formData.get("duration") || ""), 10)
    const format = String(formData.get("format") || "")

    if (!videoFile) {
      return NextResponse.json({ error: "Video file is required" }, { status: 400 })
    }

    if (videoFile.size <= 0 || videoFile.size > MAX_VIDEO_BYTES) {
      return NextResponse.json({ error: "Video must be between 1 byte and 100 MB" }, { status: 413 })
    }

    if (!ALLOWED_DURATIONS.has(duration)) {
      return NextResponse.json({ error: "Invalid clip duration" }, { status: 400 })
    }

    if (!ALLOWED_FORMATS.has(format)) {
      return NextResponse.json({ error: "Invalid video format" }, { status: 400 })
    }

    const buffer = await videoFile.arrayBuffer()
    const nonce = `${Date.now()}-${crypto.randomUUID()}`
    inputPath = join(tmpdir(), `reborn-input-${nonce}.mp4`)
    outputPath = join(tmpdir(), `reborn-output-${nonce}.mp4`)
    await writeFile(inputPath, Buffer.from(buffer))

    let width = 1920
    let height = 1080
    if (format === "vertical") {
      width = 1080
      height = 1920
    } else if (format === "square") {
      width = 1080
      height = 1080
    }

    const command = `ffmpeg -y -i "${inputPath}" -t ${duration} -vf "scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2" -c:v libx264 -crf 23 -c:a aac "${outputPath}"`

    try {
      execSync(command, { stdio: "pipe", timeout: 55_000 })
    } catch (error) {
      console.error("[Reborn Pro] FFmpeg processing unavailable", error)
      return NextResponse.json(
        {
          error: "Video processing is not available in this deployment.",
          code: "VIDEO_PROCESSOR_UNAVAILABLE",
        },
        { status: 503 },
      )
    }

    // A durable URL requires object storage. Do not fabricate a URL to an
    // ephemeral Vercel filesystem path. Until storage is connected, fail
    // explicitly after processing instead of claiming a usable clip exists.
    return NextResponse.json(
      {
        error: "Video storage is not configured yet.",
        code: "VIDEO_STORAGE_NOT_CONFIGURED",
      },
      { status: 503 },
    )
  } catch (error) {
    console.error("[Reborn Pro] video processing error", error)
    return NextResponse.json({ error: "Failed to process video" }, { status: 500 })
  } finally {
    for (const path of [inputPath, outputPath]) {
      if (!path) continue
      try {
        await unlink(path)
      } catch {
        // Best-effort cleanup of ephemeral files.
      }
    }
  }
}
