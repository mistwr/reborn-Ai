import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions as any)
    const isPro = Boolean((session?.user as any)?.isPro)

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Authentication required", code: "AUTH_REQUIRED" }, { status: 401 })
    }

    if (!isPro) {
      return NextResponse.json({ error: "Reborn AI Pro required", code: "PRO_REQUIRED" }, { status: 403 })
    }

    const { prompt, aspectRatio, style } = await request.json()

    if (typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    const safeStyle = typeof style === "string" ? style.trim().slice(0, 80) : ""
    const enhancedPrompt = safeStyle ? `${prompt.trim()}, style: ${safeStyle}` : prompt.trim()

    const response = await fetch("https://api.pollinations.ai/v1/images/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: enhancedPrompt,
        width: aspectRatio === "1:1" ? 512 : aspectRatio === "16:9" ? 800 : 450,
        height: aspectRatio === "1:1" ? 512 : aspectRatio === "16:9" ? 450 : 800,
        num_images: 1,
        guidance: 7.5,
      }),
      cache: "no-store",
    })

    if (!response.ok) {
      throw new Error(`Image provider failed (${response.status})`)
    }

    const data = await response.json()
    const imageUrl = data?.images?.[0] || data?.url

    if (typeof imageUrl !== "string" || !imageUrl) {
      throw new Error("Image provider returned no image URL")
    }

    return NextResponse.json({ imageUrl })
  } catch (error) {
    console.error("[Reborn Pro] image generation error", error)
    return NextResponse.json({ error: "Failed to generate image" }, { status: 500 })
  }
}
