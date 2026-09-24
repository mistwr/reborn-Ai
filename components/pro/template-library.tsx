'use client'

import React, { useState } from 'react'
import { TEMPLATES, getTemplatesByCategory } from '@/lib/templates'
import { useWebCraftStore } from '@/lib/stores/webcraft-store'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'

interface TemplateLibraryProps {
  onSelectTemplate: () => void
}

export const TemplateLibrary: React.FC<TemplateLibraryProps> = ({ onSelectTemplate }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const { setSelectedTemplate } = useWebCraftStore()

  const categories = ['all', 'landing', 'portfolio', 'blog', 'ecommerce', 'resume', 'documentation']

  let filteredTemplates = TEMPLATES
  if (selectedCategory !== 'all') {
    filteredTemplates = getTemplatesByCategory(selectedCategory)
  }
  if (searchTerm) {
    filteredTemplates = filteredTemplates.filter((t) => t.name.toLowerCase().includes(searchTerm.toLowerCase()) || t.tags.some((tag: string) => tag.includes(searchTerm.toLowerCase())))
  }

  const handleTemplateSelect = (template: typeof TEMPLATES[0]) => {
    setSelectedTemplate(template)
    onSelectTemplate()
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(cat)}
              className="capitalize"
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map((template) => (
          <Card
            key={template.id}
            className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => handleTemplateSelect(template)}
          >
            <div className="aspect-video bg-gray-200 flex items-center justify-center">
              <div className="text-gray-400 text-center">
                <div className="text-sm font-medium">{template.name}</div>
                <div className="text-xs">{template.category}</div>
              </div>
            </div>
            <div className="p-4">
              <h3 className="font-semibold mb-2">{template.name}</h3>
              <p className="text-sm text-gray-600 mb-3">{template.description}</p>
              <div className="flex gap-1 flex-wrap mb-3">
                {template.tags.slice(0, 2).map((tag: string) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
              <Button className="w-full" size="sm">
                Use Template
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
