'use client'

import React, { useRef, useState } from 'react'
import { useCliperStore } from '@/lib/stores/clipper-store'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Loader, Upload, Trash2, Download, Play } from 'lucide-react'

const CLIP_DURATIONS = [15, 30, 60] as const
const FORMATS = ['vertical', 'horizontal', 'square'] as const
const PLATFORMS = ['tiktok', 'reels', 'shorts', 'youtube'] as const

export const CliperAITab: React.FC = () => {
  const {
    clips,
    isProcessing,
    uploadedVideo,
    clipDuration,
    selectedFormat,
    setUploadedVideo,
    setClipDuration,
    setSelectedFormat,
    addClip,
    setIsProcessing,
    removeClip,
    clearClips,
  } = useCliperStore()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [platform, setPlatform] = useState<typeof PLATFORMS[number]>('tiktok')

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setUploadedVideo(file)
    }
  }

  const handleClipVideo = async () => {
    if (!uploadedVideo) return

    setIsProcessing(true)
    try {
      const formData = new FormData()
      formData.append('video', uploadedVideo)
      formData.append('duration', clipDuration.toString())
      formData.append('format', selectedFormat)
      formData.append('platform', platform)

      const response = await fetch('/api/pro/process-video', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) throw new Error('Failed to process video')

      const data = await response.json()
      addClip({
        id: Date.now().toString(),
        name: `${clipDuration}s ${platform} clip`,
        duration: clipDuration,
        format: selectedFormat,
        platform,
        videoUrl: data.videoUrl,
        timestamp: new Date(),
      })

      // Reset form
      setUploadedVideo(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      console.error('Video processing error:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Clipper AI</h2>
        <p className="text-gray-600">Extract and optimize video clips for social media platforms</p>
      </div>

      {/* Control Panel */}
      <Card className="p-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="space-y-4">
          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium mb-2">Upload Video</label>
            <div className="flex gap-2">
              <Input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                disabled={isProcessing}
              />
              {uploadedVideo && <span className="text-sm text-green-600 flex items-center">{uploadedVideo.name}</span>}
            </div>
          </div>

          {/* Clip Duration */}
          <div>
            <label className="block text-sm font-medium mb-2">Clip Duration (seconds)</label>
            <div className="flex gap-2">
              {CLIP_DURATIONS.map((duration) => (
                <Button
                  key={duration}
                  variant={clipDuration === duration ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setClipDuration(duration)}
                  disabled={isProcessing}
                >
                  {duration}s
                </Button>
              ))}
            </div>
          </div>

          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Format</label>
            <div className="flex gap-2">
              {FORMATS.map((format) => (
                <Button
                  key={format}
                  variant={selectedFormat === format ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedFormat(format as typeof FORMATS[number])}
                  disabled={isProcessing}
                  className="capitalize"
                >
                  {format}
                </Button>
              ))}
            </div>
          </div>

          {/* Platform Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Target Platform</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {PLATFORMS.map((p) => (
                <Button
                  key={p}
                  variant={platform === p ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPlatform(p)}
                  disabled={isProcessing}
                  className="capitalize"
                >
                  {p}
                </Button>
              ))}
            </div>
          </div>

          {/* Process Button */}
          <Button
            onClick={handleClipVideo}
            disabled={!uploadedVideo || isProcessing}
            className="w-full"
            size="lg"
          >
            {isProcessing ? (
              <>
                <Loader className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Extract Clip
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Clips Library */}
      {clips.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Generated Clips</h3>
            <Button variant="outline" size="sm" onClick={clearClips}>
              Clear All
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {clips.map((clip) => (
              <Card key={clip.id} className="overflow-hidden">
                <div className="aspect-video bg-gray-900 relative group">
                  <video
                    src={clip.videoUrl}
                    className="w-full h-full object-cover"
                    controls
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        const link = document.createElement('a')
                        link.href = clip.videoUrl
                        link.download = `${clip.name}.mp4`
                        link.click()
                      }}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => removeClip(clip.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="p-3 space-y-2">
                  <p className="text-sm font-medium">{clip.name}</p>
                  <div className="flex gap-1 flex-wrap">
                    <Badge variant="secondary" className="text-xs">
                      {clip.duration}s
                    </Badge>
                    <Badge variant="secondary" className="text-xs capitalize">
                      {clip.format}
                    </Badge>
                    <Badge variant="secondary" className="text-xs capitalize">
                      {clip.platform}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500">
                    {new Date(clip.timestamp).toLocaleString()}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {clips.length === 0 && !isProcessing && (
        <Card className="p-12 text-center border-2 border-dashed">
          <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500">Upload a video to start creating clips</p>
        </Card>
      )}
    </div>
  )
}
