import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export const maxDuration = 90

function dimensions(aspectRatio: string) {
  if (aspectRatio === "16:9") return { width: 1280, height: 720 }
  if (aspectRatio === "9:16") return { width: 720, height: 1280 }
  return { width: 1024, height: 1024 }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions as any)
    const isPro = Boolean((session?.user as any)?.isPro || (session?.user as any)?.isFounder)

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Authentication required", code: "AUTH_REQUIRED" }, { status: 401 })
    }

    if (!isPro) {
      return NextResponse.json({ error: "LUMIN AI Pro required", code: "PRO_REQUIRED" }, { status: 403 })
    }

    const { prompt, aspectRatio = "1:1", style = "" } = await request.json()
    if (typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    const size = dimensions(String(aspectRatio))
    const cookie = request.headers.get("cookie") || ""

    // Reuse the same resilient generation + Vision quality-control pipeline as
    // the main LUMIN image studio instead of maintaining a second fragile provider.
    const response = await fetch(new URL("/api/generate-image", request.url), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cookie ? { cookie } : {}),
      },
      body: JSON.stringify({
        prompt: prompt.trim(),
        width: size.width,
        height: size.height,
        quality: "hd",
        style: typeof style === "string" ? style.trim().slice(0, 100) : "",
        validate: true,
      }),
      cache: "no-store",
    })

    const data = await response.json().catch(() => null)
    if (!response.ok || !data?.url) {
      return NextResponse.json(
        { error: data?.error || "Image generation failed", code: data?.code || "IMAGE_GENERATION_FAILED" },
        { status: response.status || 500 },
      )
    }

    return NextResponse.json({
      imageUrl: data.url,
      provider: data.provider,
      providerSource: data.providerSource,
      qualityControl: data.qualityControl,
      retried: data.retried,
      note: data.note,
    })
  } catch (error) {
    console.error("[LUMIN Pro] image generation error", error)
    return NextResponse.json({ error: "Failed to generate image" }, { status: 500 })
  }
}
