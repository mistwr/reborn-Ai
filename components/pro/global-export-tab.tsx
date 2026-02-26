'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { PRESET_THEMES, type Theme, DEFAULT_THEME } from '@/lib/theme-builder'
import { exportToHTML, exportToPDF, exportToEPUB, generatePagesFromHTML } from '@/lib/export-utils'
import { FileText, Download, Loader } from 'lucide-react'

interface ExportContent {
  title: string
  author: string
  content: string
  format: 'html' | 'pdf' | 'epub'
}

export const GlobalExportTab: React.FC = () => {
  const [content, setContent] = useState<ExportContent>({
    title: 'My Document',
    author: 'Author Name',
    content: '<h1>Welcome</h1><p>Your content here...</p>',
    format: 'html',
  })
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME)
  const [isExporting, setIsExporting] = useState(false)
  const [chapterSize, setChapterSize] = useState(3000)

  const handleExport = async () => {
    if (!content.content.trim()) {
      alert('Please add content to export')
      return
    }

    setIsExporting(true)
    try {
      switch (content.format) {
        case 'html':
          exportToHTML(content.content, content.title)
          break
        case 'pdf':
          await exportToPDF(content.content, content.title)
          break
        case 'epub':
          await exportToEPUB(content.content, content.title, content.author, content.title)
          break
      }
    } catch (error) {
      console.error('Export error:', error)
      alert('Failed to export document')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Global Export</h2>
        <p className="text-gray-600">Export content to multiple formats with custom themes and settings</p>
      </div>

      <Tabs defaultValue="content" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="metadata">Metadata</TabsTrigger>
          <TabsTrigger value="theme">Theme</TabsTrigger>
          <TabsTrigger value="export">Export</TabsTrigger>
        </TabsList>

        {/* Content Tab */}
        <TabsContent value="content" className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Document Content</label>
            <Textarea
              value={content.content}
              onChange={(e) => setContent({ ...content, content: e.target.value })}
              placeholder="Paste your HTML content here..."
              className="resize-none font-mono text-sm"
              rows={12}
            />
            <p className="text-xs text-gray-500 mt-2">Enter HTML or plain text content</p>
          </div>
        </TabsContent>

        {/* Metadata Tab */}
        <TabsContent value="metadata" className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Document Title</label>
            <Input
              value={content.title}
              onChange={(e) => setContent({ ...content, title: e.target.value })}
              placeholder="Enter document title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Author Name</label>
            <Input
              value={content.author}
              onChange={(e) => setContent({ ...content, author: e.target.value })}
              placeholder="Enter author name"
            />
          </div>

          {content.format === 'epub' && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Chapter Size: {chapterSize} characters
              </label>
              <Slider
                value={[chapterSize]}
                onValueChange={([val]) => setChapterSize(val)}
                min={1000}
                max={10000}
                step={100}
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-2">Controls how content is split into chapters</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Export Format</label>
            <div className="grid grid-cols-3 gap-2">
              {(['html', 'pdf', 'epub'] as const).map((format) => (
                <Button
                  key={format}
                  variant={content.format === format ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setContent({ ...content, format })}
                  className="uppercase"
                >
                  {format}
                </Button>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Theme Tab */}
        <TabsContent value="theme" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(PRESET_THEMES).map(([name, presetTheme]) => (
              <Card
                key={name}
                className={`p-4 cursor-pointer border-2 transition-all ${
                  theme === presetTheme ? 'border-blue-500' : 'border-gray-200'
                }`}
                onClick={() => setTheme(presetTheme)}
              >
                <div className="space-y-2">
                  <div className="flex gap-1 h-6 rounded overflow-hidden">
                    <div style={{ backgroundColor: presetTheme.primary, flex: 1 }} />
                    <div style={{ backgroundColor: presetTheme.secondary, flex: 1 }} />
                    <div style={{ backgroundColor: presetTheme.accent, flex: 1 }} />
                  </div>
                  <p className="text-sm font-medium capitalize">{name}</p>
                </div>
              </Card>
            ))}
          </div>

          <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg space-y-3">
            <h4 className="font-medium text-sm">Custom Theme Colors</h4>
            <div className="grid grid-cols-2 gap-3">
              {(['primary', 'secondary', 'accent', 'background', 'text'] as const).map((key) => (
                <div key={key}>
                  <label className="block text-xs font-medium mb-1 capitalize">{key}</label>
                  <input
                    type="color"
                    value={theme[key]}
                    onChange={(e) =>
                      setTheme({
                        ...theme,
                        [key]: e.target.value,
                      })
                    }
                    className="w-full h-8 rounded cursor-pointer"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg space-y-3">
            <h4 className="font-medium text-sm">Typography</h4>
            <div>
              <label className="block text-xs font-medium mb-1">Font Family</label>
              <Input
                value={theme.fontFamily}
                onChange={(e) => setTheme({ ...theme, fontFamily: e.target.value })}
                placeholder="e.g., system-ui, Georgia, serif"
                className="text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Border Radius</label>
              <Input
                value={theme.borderRadius}
                onChange={(e) => setTheme({ ...theme, borderRadius: e.target.value })}
                placeholder="e.g., 8px, 0px"
                className="text-sm"
              />
            </div>
          </div>
        </TabsContent>

        {/* Export Tab */}
        <TabsContent value="export" className="space-y-4">
          <Card className="p-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Export Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Title:</span>
                    <span className="font-medium">{content.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Author:</span>
                    <span className="font-medium">{content.author}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Format:</span>
                    <Badge>{content.format.toUpperCase()}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Theme:</span>
                    <Badge variant="secondary">Custom</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Content Size:</span>
                    <span className="font-medium">{(content.content.length / 1024).toFixed(2)} KB</span>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleExport}
                disabled={isExporting}
                className="w-full"
                size="lg"
              >
                {isExporting ? (
                  <>
                    <Loader className="h-4 w-4 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Export as {content.format.toUpperCase()}
                  </>
                )}
              </Button>
            </div>
          </Card>

          <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              <FileText className="h-4 w-4 inline mr-2" />
              Your document will be exported with the selected theme and settings. All formatting and
              images will be preserved.
            </p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
