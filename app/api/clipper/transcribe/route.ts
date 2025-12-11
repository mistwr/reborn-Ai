import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get("audio") as File

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 })
    }

    const assemblyKey = process.env.ASSEMBLYAI_API_KEY

    if (!assemblyKey) {
      return NextResponse.json({ error: "AssemblyAI API key not configured" }, { status: 500 })
    }

    // Upload audio to AssemblyAI
    const uploadResponse = await fetch("https://api.assemblyai.com/v2/upload", {
      method: "POST",
      headers: {
        authorization: assemblyKey,
      },
      body: audioFile,
    })

    const uploadData = await uploadResponse.json()

    // Start transcription
    const transcriptResponse = await fetch("https://api.assemblyai.com/v2/transcript", {
      method: "POST",
      headers: {
        authorization: assemblyKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        audio_url: uploadData.upload_url,
        language_detection: true,
      }),
    })

    const transcriptData = await transcriptResponse.json()

    // Poll for completion
    let result = transcriptData
    while (result.status !== "completed" && result.status !== "error") {
      await new Promise((resolve) => setTimeout(resolve, 3000))
      const pollResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${result.id}`, {
        headers: { authorization: assemblyKey },
      })
      result = await pollResponse.json()
    }

    if (result.status === "error") {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ transcript: result.text, words: result.words })
  } catch (error) {
    console.error("Transcription error:", error)
    return NextResponse.json({ error: "Failed to transcribe" }, { status: 500 })
  }
}
