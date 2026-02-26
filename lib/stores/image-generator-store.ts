'use client'

import { create } from 'zustand'

export interface GeneratedImage {
  id: string
  prompt: string
  aspectRatio: '1:1' | '16:9' | '9:16'
  style: 'Fotorealista' | 'Anime' | 'Digital Art' | 'Illustration' | '3D'
  imageUrl: string
  timestamp: Date
}

export interface ImageGeneratorState {
  images: GeneratedImage[]
  isGenerating: boolean
  prompt: string
  selectedAspectRatio: '1:1' | '16:9' | '9:16'
  selectedStyle: 'Fotorealista' | 'Anime' | 'Digital Art' | 'Illustration' | '3D'
  setPrompt: (prompt: string) => void
  setAspectRatio: (ratio: '1:1' | '16:9' | '9:16') => void
  setStyle: (style: 'Fotorealista' | 'Anime' | 'Digital Art' | 'Illustration' | '3D') => void
  addImage: (image: GeneratedImage) => void
  setIsGenerating: (generating: boolean) => void
  clearHistory: () => void
}

export const useImageGeneratorStore = create<ImageGeneratorState>((set) => ({
  images: [],
  isGenerating: false,
  prompt: '',
  selectedAspectRatio: '1:1',
  selectedStyle: 'Fotorealista',
  setPrompt: (prompt: string) => set({ prompt }),
  setAspectRatio: (ratio: '1:1' | '16:9' | '9:16') => set({ selectedAspectRatio: ratio }),
  setStyle: (style: 'Fotorealista' | 'Anime' | 'Digital Art' | 'Illustration' | '3D') => set({ selectedStyle: style }),
  addImage: (image: GeneratedImage) => set((state) => ({ images: [image, ...state.images] })),
  setIsGenerating: (generating: boolean) => set({ isGenerating: generating }),
  clearHistory: () => set({ images: [] }),
}))
