'use client'

import React, { useState } from 'react'
import { useWebCraftStore } from '@/lib/stores/webcraft-store'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PRESET_THEMES, applyTheme, type Theme, DEFAULT_THEME } from '@/lib/theme-builder'
import { exportToHTML } from '@/lib/export-utils'
import { Copy, Download, Undo2, Redo2, Eye } from 'lucide-react'

export const LiveEditor: React.FC = () => {
  const { selectedTemplate, editedHtml, setEditedHtml } = useWebCraftStore()
  const [previewTheme, setPreviewTheme] = useState<Theme>(DEFAULT_THEME)
  const [history, setHistory] = useState<string[]>([editedHtml])
  const [historyIndex, setHistoryIndex] = useState(0)
  const [previewMode, setPreviewMode] = useState(false)

  if (!selectedTemplate) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-500">Select a template to start editing</p>
      </div>
    )
  }

  const handleHtmlChange = (newHtml: string) => {
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(newHtml)
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
    setEditedHtml(newHtml)
  }

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      setEditedHtml(history[newIndex])
    }
  }

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1
      setHistoryIndex(newIndex)
      setEditedHtml(history[newIndex])
    }
  }

  const handleExport = () => {
    const htmlWithTheme = applyTheme(editedHtml, previewTheme)
    exportToHTML(htmlWithTheme, selectedTemplate.name)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(editedHtml)
  }

  const themedHtml = applyTheme(editedHtml, previewTheme)

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center">
        <h2 className="text-lg font-semibold flex-1">{selectedTemplate.name}</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={handleUndo}
          disabled={historyIndex === 0}
          title="Undo"
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRedo}
          disabled={historyIndex === history.length - 1}
          title="Redo"
        >
          <Redo2 className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={handleCopy} title="Copy HTML">
          <Copy className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={handleExport} title="Export HTML">
          <Download className="h-4 w-4" />
        </Button>
        <Button
          variant={previewMode ? 'default' : 'outline'}
          size="sm"
          onClick={() => setPreviewMode(!previewMode)}
        >
          <Eye className="h-4 w-4 mr-2" />
          {previewMode ? 'Edit' : 'Preview'}
        </Button>
      </div>

      <Tabs defaultValue="editor" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="editor">Editor</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="themes">Themes</TabsTrigger>
        </TabsList>

        <TabsContent value="editor" className="space-y-4">
          <textarea
            value={editedHtml}
            onChange={(e) => handleHtmlChange(e.target.value)}
            className="w-full h-96 p-4 border rounded-lg font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Edit your HTML here..."
          />
        </TabsContent>

        <TabsContent value="preview">
          <Card className="p-4 bg-white">
            <iframe
              srcDoc={previewMode ? themedHtml : editedHtml}
              className="w-full h-96 border rounded-lg"
              title="Preview"
              sandbox={{} as any}
            />
          </Card>
        </TabsContent>

        <TabsContent value="themes" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(PRESET_THEMES).map(([name, theme]) => (
              <Card
                key={name}
                className={`p-4 cursor-pointer border-2 transition-all ${
                  previewTheme === theme ? 'border-blue-500' : 'border-gray-200'
                }`}
                onClick={() => setPreviewTheme(theme)}
              >
                <div className="space-y-2">
                  <div className="flex gap-1 h-6 rounded">
                    <div style={{ backgroundColor: theme.primary, flex: 1 }} />
                    <div style={{ backgroundColor: theme.secondary, flex: 1 }} />
                    <div style={{ backgroundColor: theme.accent, flex: 1 }} />
                  </div>
                  <p className="text-sm font-medium capitalize">{name}</p>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
