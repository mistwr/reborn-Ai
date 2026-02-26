'use client'

import { create } from 'zustand'

export interface VideoClip {
  id: string
  name: string
  duration: number
  format: 'vertical' | 'horizontal' | 'square'
  platform: 'tiktok' | 'reels' | 'shorts' | 'youtube'
  videoUrl: string
  timestamp: Date
}

export interface CliperState {
  clips: VideoClip[]
  isProcessing: boolean
  uploadedVideo: File | null
  clipDuration: 15 | 30 | 60
  selectedFormat: 'vertical' | 'horizontal' | 'square'
  setUploadedVideo: (file: File | null) => void
  setClipDuration: (duration: 15 | 30 | 60) => void
  setSelectedFormat: (format: 'vertical' | 'horizontal' | 'square') => void
  addClip: (clip: VideoClip) => void
  setIsProcessing: (processing: boolean) => void
  removeClip: (id: string) => void
  clearClips: () => void
}

export const useCliperStore = create<CliperState>((set) => ({
  clips: [],
  isProcessing: false,
  uploadedVideo: null,
  clipDuration: 30,
  selectedFormat: 'vertical',
  setUploadedVideo: (file: File | null) => set({ uploadedVideo: file }),
  setClipDuration: (duration: 15 | 30 | 60) => set({ clipDuration: duration }),
  setSelectedFormat: (format: 'vertical' | 'horizontal' | 'square') => set({ selectedFormat: format }),
  addClip: (clip: VideoClip) => set((state) => ({ clips: [...state.clips, clip] })),
  setIsProcessing: (processing: boolean) => set({ isProcessing: processing }),
  removeClip: (id: string) => set((state) => ({ clips: state.clips.filter((c) => c.id !== id) })),
  clearClips: () => set({ clips: [] }),
}))
