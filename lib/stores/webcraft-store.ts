'use client'

import { create } from 'zustand'

export interface Template {
  id: string
  name: string
  category: 'landing' | 'portfolio' | 'blog' | 'ecommerce' | 'resume' | 'documentation'
  thumbnail: string
  html: string
  description: string
  tags: string[]
}

export interface WebCraftState {
  templates: Template[]
  selectedTemplate: Template | null
  editedHtml: string
  setSelectedTemplate: (template: Template) => void
  setEditedHtml: (html: string) => void
  updateTemplate: (id: string, html: string) => void
}

export const useWebCraftStore = create<WebCraftState>((set) => ({
  templates: [],
  selectedTemplate: null,
  editedHtml: '',
  setSelectedTemplate: (template: Template) => set({ selectedTemplate: template, editedHtml: template.html }),
  setEditedHtml: (html: string) => set({ editedHtml: html }),
  updateTemplate: (id: string, html: string) => set((state) => ({
    templates: state.templates.map((t) => (t.id === id ? { ...t, html } : t)),
  })),
}))
