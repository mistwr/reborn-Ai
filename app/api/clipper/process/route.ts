import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { videoUrl, startTime, endTime } = await request.json()

    const workerUrl = process.env.CLOUDFLARE_CLIPPER_WORKER_URL

    if (!workerUrl) {
      return NextResponse.json({ error: "Clipper worker not configured" }, { status: 500 })
    }

    const response = await fetch(workerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoUrl, startTime, endTime }),
    })

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Process error:", error)
    return NextResponse.json({ error: "Failed to process video" }, { status: 500 })
  }
}
