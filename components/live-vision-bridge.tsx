"use client"

import { useEffect } from "react"

function pathnameOf(input: RequestInfo | URL) {
  try {
    if (typeof input === "string") return new URL(input, window.location.origin).pathname
    if (input instanceof URL) return input.pathname
    return new URL(input.url, window.location.origin).pathname
  } catch {
    return ""
  }
}

async function captureFrame(stream: MediaStream): Promise<string | null> {
  const track = stream.getVideoTracks().find((t) => t.readyState === "live" && t.enabled)
  if (!track) return null

  const video = document.createElement("video")
  video.muted = true
  video.playsInline = true
  video.srcObject = new MediaStream([track])

  try {
    await video.play()
    await new Promise((resolve) => setTimeout(resolve, 120))

    const width = Math.min(video.videoWidth || 640, 768)
    const sourceWidth = video.videoWidth || width
    const sourceHeight = video.videoHeight || Math.round(width * 0.75)
    const height = Math.max(1, Math.round((sourceHeight / sourceWidth) * width))

    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext("2d")
    if (!ctx) return null
    ctx.drawImage(video, 0, 0, width, height)
    return canvas.toDataURL("image/jpeg", 0.72)
  } catch {
    return null
  } finally {
    video.pause()
    video.srcObject = null
  }
}

export function LiveVisionBridge() {
  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) return

    const mediaDevices = navigator.mediaDevices
    const originalGetUserMedia = mediaDevices.getUserMedia.bind(mediaDevices)
    const originalFetch = window.fetch.bind(window)
    let latestVideoStream: MediaStream | null = null

    mediaDevices.getUserMedia = async (constraints?: MediaStreamConstraints) => {
      const stream = await originalGetUserMedia(constraints)
      if (constraints && typeof constraints === "object" && constraints.video) {
        latestVideoStream = stream
      }
      return stream
    }

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      if (pathnameOf(input) !== "/api/live" || !init?.body || typeof init.body !== "string") {
        return originalFetch(input, init)
      }

      try {
        const body = JSON.parse(init.body)
        const wantsVision = body?.mode === "both" || body?.mode === "video"
        if (wantsVision && latestVideoStream) {
          const frame = await captureFrame(latestVideoStream)
          if (frame) {
            body.imageDataUrl = frame
            body.cameraFrameCapturedAt = new Date().toISOString()
          }
        }
        return originalFetch(input, { ...init, body: JSON.stringify(body) })
      } catch {
        return originalFetch(input, init)
      }
    }

    return () => {
      mediaDevices.getUserMedia = originalGetUserMedia
      window.fetch = originalFetch
    }
  }, [])

  return null
}
