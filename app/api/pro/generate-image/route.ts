import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { prompt, aspectRatio, style } = await request.json()

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    // Build the prompt with style modifier
    const enhancedPrompt = `${prompt}, style: ${style}`

    // Call Pollinations API
    const response = await fetch('https://api.pollinations.ai/v1/images/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: enhancedPrompt,
        width: aspectRatio === '1:1' ? 512 : aspectRatio === '16:9' ? 800 : 450,
        height: aspectRatio === '1:1' ? 512 : aspectRatio === '16:9' ? 450 : 800,
        num_images: 1,
        guidance: 7.5,
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to generate image from Pollinations API')
    }

    const data = await response.json()
    const imageUrl = data.images?.[0] || data.url

    return NextResponse.json({ imageUrl })
  } catch (error) {
    console.error('Image generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate image' },
      { status: 500 }
    )
  }
}
