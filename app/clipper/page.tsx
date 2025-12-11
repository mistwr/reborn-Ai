"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Scissors, Upload, Loader2, Sparkles, ArrowLeft } from "lucide-react"
import Link from "next/link"

interface Clip {
  start: number
  end: number
  text: string
  score: number
  reason: string
}

export default function ClipperPage() {
  const [videoUrl, setVideoUrl] = useState("")
  const [transcript, setTranscript] = useState("")
  const [clips, setClips] = useState<Clip[]>([])
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [selectedClip, setSelectedClip] = useState<Clip | null>(null)

  const handleTranscribe = async () => {
    setIsTranscribing(true)
    try {
      const response = await fetch("/api/clipper/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoUrl }),
      })
      const data = await response.json()
      setTranscript(data.transcript)
    } catch (error) {
      console.error("Transcription failed:", error)
    }
    setIsTranscribing(false)
  }

  const handleAnalyze = async () => {
    setIsAnalyzing(true)
    try {
      const response = await fetch("/api/clipper/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      })
      const data = await response.json()
      setClips(data.clips || [])
    } catch (error) {
      console.error("Analysis failed:", error)
    }
    setIsAnalyzing(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Scissors className="h-6 w-6 text-purple-400" />
            <span className="text-xl font-bold text-white">AI Clipper</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Extrair Clips Virais</CardTitle>
              <CardDescription>Cole o URL do vídeo ou carregue a transcrição</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="URL do vídeo (YouTube, etc.)"
                  className="bg-slate-800/50 border-slate-700 text-white"
                />
                <Button onClick={handleTranscribe} disabled={isTranscribing || !videoUrl}>
                  {isTranscribing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                </Button>
              </div>

              <Textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Ou cole a transcrição aqui..."
                className="min-h-[200px] bg-slate-800/50 border-slate-700 text-white"
              />

              <Button
                onClick={handleAnalyze}
                disabled={isAnalyzing || !transcript}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analisando...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Encontrar Clips Virais
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {clips.length > 0 && (
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Clips Encontrados ({clips.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {clips
                      .sort((a, b) => b.score - a.score)
                      .map((clip, index) => (
                        <div
                          key={index}
                          onClick={() => setSelectedClip(clip)}
                          className={`p-4 rounded-lg border cursor-pointer transition-all ${
                            selectedClip === clip
                              ? "bg-purple-900/30 border-purple-500"
                              : "bg-slate-800/30 border-slate-700 hover:border-slate-600"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <Badge
                              variant={clip.score >= 8 ? "default" : "secondary"}
                              className={clip.score >= 8 ? "bg-green-600" : ""}
                            >
                              Score: {clip.score}/10
                            </Badge>
                            <span className="text-xs text-slate-400">
                              {clip.start}s - {clip.end}s
                            </span>
                          </div>
                          <p className="text-sm text-white mb-2">{clip.text}</p>
                          <p className="text-xs text-slate-400">{clip.reason}</p>
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
