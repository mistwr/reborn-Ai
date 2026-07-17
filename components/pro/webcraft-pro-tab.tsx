'use client'

import React, { useState } from 'react'
import { TemplateLibrary } from './template-library'
import { LiveEditor } from './live-editor'
import { useWebCraftStore } from '@/lib/stores/webcraft-store'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export const WebCraftProTab: React.FC = () => {
  const [isEditing, setIsEditing] = useState(false)
  const { selectedTemplate } = useWebCraftStore()

  if (isEditing && selectedTemplate) {
    return (
      <div className="space-y-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsEditing(false)}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Templates
        </Button>
        <LiveEditor />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">WebCraft Pro</h2>
        <p className="text-gray-600">Choose a template and customize it with our live editor</p>
      </div>
      <TemplateLibrary onSelectTemplate={() => setIsEditing(true)} />
    </div>
  )
}
