"use client"

import { useState, useEffect, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Search,
  Download,
  Copy,
  Check,
  Loader2,
  ImageIcon,
  Grid3X3,
  LayoutGrid,
  Maximize2,
  X,
  RefreshCw,
  Shuffle,
  Heart,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
} from "lucide-react"

// APIs de imagens gratuitas sem API key
const IMAGE_SOURCES = {
  unsplash: {
    name: "Unsplash",
    baseUrl: "https://source.unsplash.com",
    searchUrl: (query: string, w: number, h: number) => 
      `https://source.unsplash.com/${w}x${h}/?${encodeURIComponent(query)}&sig=${Math.random()}`,
    randomUrl: (w: number, h: number) => 
      `https://source.unsplash.com/random/${w}x${h}?sig=${Math.random()}`,
  },
  picsum: {
    name: "Lorem Picsum",
    baseUrl: "https://picsum.photos",
    searchUrl: (query: string, w: number, h: number) => 
      `https://picsum.photos/${w}/${h}?random=${Math.random()}`,
    randomUrl: (w: number, h: number) => 
      `https://picsum.photos/${w}/${h}?random=${Math.random()}`,
    listUrl: (page: number, limit: number) =>
      `https://picsum.photos/v2/list?page=${page}&limit=${limit}`,
  },
  loremflickr: {
    name: "LoremFlickr",
    baseUrl: "https://loremflickr.com",
    searchUrl: (query: string, w: number, h: number) => 
      `https://loremflickr.com/${w}/${h}/${encodeURIComponent(query)}?random=${Math.random()}`,
    randomUrl: (w: number, h: number) => 
      `https://loremflickr.com/${w}/${h}?random=${Math.random()}`,
  },
}

// Categorias populares para pesquisa
const CATEGORIES = [
  { id: "nature", label: "Natureza", icon: "🌿", keywords: ["nature", "forest", "mountains", "ocean", "sky"] },
  { id: "business", label: "Negocios", icon: "💼", keywords: ["business", "office", "meeting", "work", "corporate"] },
  { id: "technology", label: "Tecnologia", icon: "💻", keywords: ["technology", "computer", "coding", "digital", "tech"] },
  { id: "food", label: "Comida", icon: "🍕", keywords: ["food", "restaurant", "cooking", "healthy", "cuisine"] },
  { id: "travel", label: "Viagem", icon: "✈️", keywords: ["travel", "adventure", "vacation", "explore", "journey"] },
  { id: "architecture", label: "Arquitetura", icon: "🏛️", keywords: ["architecture", "building", "city", "urban", "modern"] },
  { id: "people", label: "Pessoas", icon: "👥", keywords: ["people", "portrait", "team", "diversity", "community"] },
  { id: "animals", label: "Animais", icon: "🐾", keywords: ["animals", "wildlife", "pets", "nature", "zoo"] },
  { id: "art", label: "Arte", icon: "🎨", keywords: ["art", "painting", "creative", "design", "abstract"] },
  { id: "sports", label: "Desporto", icon: "⚽", keywords: ["sports", "fitness", "gym", "running", "health"] },
  { id: "fashion", label: "Moda", icon: "👗", keywords: ["fashion", "style", "clothing", "model", "beauty"] },
  { id: "music", label: "Musica", icon: "🎵", keywords: ["music", "concert", "instruments", "band", "audio"] },
]

// Tamanhos predefinidos
const SIZES = [
  { id: "small", label: "Pequeno", w: 400, h: 300 },
  { id: "medium", label: "Medio", w: 800, h: 600 },
  { id: "large", label: "Grande", w: 1200, h: 800 },
  { id: "hd", label: "HD", w: 1920, h: 1080 },
  { id: "square", label: "Quadrado", w: 800, h: 800 },
  { id: "portrait", label: "Retrato", w: 600, h: 900 },
  { id: "story", label: "Story", w: 1080, h: 1920 },
  { id: "banner", label: "Banner", w: 1200, h: 400 },
]

interface ImageItem {
  id: string
  url: string
  thumbUrl: string
  downloadUrl: string
  author?: string
  source: string
  query?: string
  width: number
  height: number
}

export function ImageBank() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedSize, setSelectedSize] = useState("medium")
  const [images, setImages] = useState<ImageItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedImage, setSelectedImage] = useState<ImageItem | null>(null)
  const [copied, setCopied] = useState(false)
  const [favorites, setFavorites] = useState<ImageItem[]>([])
  const [viewMode, setViewMode] = useState<"grid" | "masonry">("grid")
  const [activeTab, setActiveTab] = useState<"search" | "slideshow" | "favorites">("search")
  
  // Slideshow state
  const [slideshowImages, setSlideshowImages] = useState<ImageItem[]>([])
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [slideshowInterval, setSlideshowInterval] = useState(5000)

  const size = SIZES.find(s => s.id === selectedSize) || SIZES[1]

  // Gerar imagens baseadas na pesquisa
  const generateImages = useCallback(async (query: string, count: number = 12) => {
    setIsLoading(true)
    const newImages: ImageItem[] = []
    
    // Gerar imagens de multiplas fontes
    for (let i = 0; i < count; i++) {
      const sources = Object.keys(IMAGE_SOURCES) as Array<keyof typeof IMAGE_SOURCES>
      const sourceKey = sources[i % sources.length]
      const source = IMAGE_SOURCES[sourceKey]
      
      const id = `${sourceKey}-${Date.now()}-${i}`
      const url = query 
        ? source.searchUrl(query, size.w, size.h)
        : source.randomUrl(size.w, size.h)
      
      newImages.push({
        id,
        url,
        thumbUrl: query 
          ? source.searchUrl(query, 400, 300)
          : source.randomUrl(400, 300),
        downloadUrl: url,
        source: source.name,
        query,
        width: size.w,
        height: size.h,
      })
    }
    
    setImages(newImages)
    setIsLoading(false)
  }, [size])

  // Carregar imagens do Picsum (tem API de lista)
  const loadPicsumImages = async (page: number = 1) => {
    setIsLoading(true)
    try {
      const res = await fetch(`https://picsum.photos/v2/list?page=${page}&limit=30`)
      const data = await res.json()
      
      const newImages: ImageItem[] = data.map((img: any) => ({
        id: img.id,
        url: `https://picsum.photos/id/${img.id}/${size.w}/${size.h}`,
        thumbUrl: `https://picsum.photos/id/${img.id}/400/300`,
        downloadUrl: img.download_url,
        author: img.author,
        source: "Lorem Picsum",
        width: size.w,
        height: size.h,
      }))
      
      setImages(newImages)
    } catch (error) {
      console.error("Erro ao carregar imagens:", error)
    }
    setIsLoading(false)
  }

  // Pesquisar por categoria
  const searchByCategory = (categoryId: string) => {
    const category = CATEGORIES.find(c => c.id === categoryId)
    if (category) {
      const randomKeyword = category.keywords[Math.floor(Math.random() * category.keywords.length)]
      setSearchQuery(randomKeyword)
      setSelectedCategory(categoryId)
      generateImages(randomKeyword)
    }
  }

  // Pesquisar
  const handleSearch = () => {
    if (searchQuery.trim()) {
      generateImages(searchQuery.trim())
    }
  }

  // Copiar URL
  const copyUrl = async (url: string) => {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  // Download
  const downloadImage = async (img: ImageItem) => {
    try {
      const response = await fetch(img.downloadUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `image-${img.id}.jpg`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch {
      window.open(img.downloadUrl, "_blank")
    }
  }

  // Toggle favorito
  const toggleFavorite = (img: ImageItem) => {
    setFavorites(prev => {
      const exists = prev.find(f => f.id === img.id)
      if (exists) {
        return prev.filter(f => f.id !== img.id)
      }
      return [...prev, img]
    })
  }

  // Slideshow controls
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    
    if (isPlaying && slideshowImages.length > 0) {
      interval = setInterval(() => {
        setCurrentSlideIndex(prev => 
          prev >= slideshowImages.length - 1 ? 0 : prev + 1
        )
      }, slideshowInterval)
    }
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isPlaying, slideshowImages.length, slideshowInterval])

  // Iniciar slideshow
  const startSlideshow = (category?: string) => {
    setActiveTab("slideshow")
    const query = category || selectedCategory || "nature"
    
    // Gerar imagens para slideshow
    const newImages: ImageItem[] = []
    for (let i = 0; i < 20; i++) {
      const sources = Object.keys(IMAGE_SOURCES) as Array<keyof typeof IMAGE_SOURCES>
      const sourceKey = sources[i % sources.length]
      const source = IMAGE_SOURCES[sourceKey]
      
      newImages.push({
        id: `slide-${Date.now()}-${i}`,
        url: source.searchUrl(query, 1920, 1080),
        thumbUrl: source.searchUrl(query, 400, 300),
        downloadUrl: source.searchUrl(query, 1920, 1080),
        source: source.name,
        query,
        width: 1920,
        height: 1080,
      })
    }
    
    setSlideshowImages(newImages)
    setCurrentSlideIndex(0)
    setIsPlaying(true)
  }

  // Carregar imagens iniciais
  useEffect(() => {
    loadPicsumImages()
  }, [])

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Header com tabs */}
      <div className="border-b border-border px-4 pt-3 pb-0 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-lg">Banco de Imagens</h2>
            <Badge variant="outline" className="text-xs">Milhares de imagens gratis</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode("grid")}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "masonry" ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode("masonry")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex gap-1">
          {[
            { id: "search" as const, label: "Pesquisar", icon: Search },
            { id: "slideshow" as const, label: "Slideshow", icon: Play },
            { id: "favorites" as const, label: `Favoritos (${favorites.length})`, icon: Heart },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Search Tab */}
      {activeTab === "search" && (
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Search bar */}
            <Card className="p-4">
              <div className="flex gap-2">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Pesquisar imagens (ex: nature, business, food...)"
                  className="flex-1"
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
                <Button onClick={handleSearch} disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
                <Button variant="outline" onClick={() => generateImages("", 12)}>
                  <Shuffle className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Size selector */}
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <span className="text-xs text-muted-foreground">Tamanho:</span>
                {SIZES.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSize(s.id)}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                      selectedSize === s.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </Card>

            {/* Categories */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">Categorias Populares</h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => searchByCategory(cat.id)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all hover:border-primary/50 hover:bg-primary/5 ${
                      selectedCategory === cat.id ? "border-primary bg-primary/10" : "border-border"
                    }`}
                  >
                    <span className="text-2xl">{cat.icon}</span>
                    <span className="text-xs font-medium">{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Image Grid */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground">
                  {searchQuery ? `Resultados para "${searchQuery}"` : "Imagens em Destaque"}
                </h3>
                <Button variant="ghost" size="sm" onClick={() => startSlideshow()}>
                  <Play className="h-3.5 w-3.5 mr-1" />
                  Slideshow
                </Button>
              </div>
              
              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className={viewMode === "grid" 
                  ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3"
                  : "columns-2 sm:columns-3 md:columns-4 gap-3 space-y-3"
                }>
                  {images.map((img) => (
                    <div
                      key={img.id}
                      className={`group relative overflow-hidden rounded-xl border border-border bg-muted cursor-pointer transition-all hover:border-primary/50 hover:shadow-lg ${
                        viewMode === "masonry" ? "break-inside-avoid mb-3" : "aspect-[4/3]"
                      }`}
                      onClick={() => setSelectedImage(img)}
                    >
                      <img
                        src={img.thumbUrl}
                        alt={img.query || "Image"}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                          <div className="flex items-center justify-between">
                            <Badge variant="secondary" className="text-[10px]">{img.source}</Badge>
                            <div className="flex gap-1">
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleFavorite(img) }}
                                className={`p-1.5 rounded-full transition-colors ${
                                  favorites.find(f => f.id === img.id)
                                    ? "bg-red-500 text-white"
                                    : "bg-black/50 text-white hover:bg-black/70"
                                }`}
                              >
                                <Heart className="h-3.5 w-3.5" fill={favorites.find(f => f.id === img.id) ? "currentColor" : "none"} />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); downloadImage(img) }}
                                className="p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                              >
                                <Download className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Load more */}
              <div className="flex justify-center pt-4">
                <Button variant="outline" onClick={() => loadPicsumImages(Math.floor(Math.random() * 10) + 1)}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Carregar Mais
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Slideshow Tab */}
      {activeTab === "slideshow" && (
        <div className="flex-1 flex flex-col min-h-0">
          {slideshowImages.length > 0 ? (
            <>
              {/* Main slide */}
              <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
                <img
                  src={slideshowImages[currentSlideIndex]?.url}
                  alt="Slideshow"
                  className="max-w-full max-h-full object-contain transition-opacity duration-500"
                />
                
                {/* Controls overlay */}
                <div className="absolute inset-0 flex items-center justify-between px-4">
                  <button
                    onClick={() => setCurrentSlideIndex(prev => prev > 0 ? prev - 1 : slideshowImages.length - 1)}
                    className="p-3 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    onClick={() => setCurrentSlideIndex(prev => prev < slideshowImages.length - 1 ? prev + 1 : 0)}
                    className="p-3 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </div>
                
                {/* Bottom controls */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                  <div className="flex items-center justify-center gap-4">
                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="p-3 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
                    >
                      {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                    </button>
                    <span className="text-white text-sm">
                      {currentSlideIndex + 1} / {slideshowImages.length}
                    </span>
                    <select
                      value={slideshowInterval}
                      onChange={(e) => setSlideshowInterval(Number(e.target.value))}
                      className="bg-white/20 text-white text-sm rounded px-2 py-1 border-0"
                    >
                      <option value={3000}>3s</option>
                      <option value={5000}>5s</option>
                      <option value={10000}>10s</option>
                    </select>
                  </div>
                  
                  {/* Progress dots */}
                  <div className="flex justify-center gap-1 mt-3">
                    {slideshowImages.slice(0, 20).map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentSlideIndex(i)}
                        className={`h-1.5 rounded-full transition-all ${
                          i === currentSlideIndex ? "w-6 bg-white" : "w-1.5 bg-white/40"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
              <Play className="h-16 w-16 text-muted-foreground/30" />
              <p className="text-muted-foreground">Seleciona uma categoria para iniciar o slideshow</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {CATEGORIES.slice(0, 6).map(cat => (
                  <Button
                    key={cat.id}
                    variant="outline"
                    onClick={() => startSlideshow(cat.keywords[0])}
                  >
                    <span className="mr-2">{cat.icon}</span>
                    {cat.label}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Favorites Tab */}
      {activeTab === "favorites" && (
        <div className="flex-1 overflow-y-auto p-4">
          {favorites.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {favorites.map((img) => (
                <div
                  key={img.id}
                  className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-border bg-muted cursor-pointer"
                  onClick={() => setSelectedImage(img)}
                >
                  <img
                    src={img.thumbUrl}
                    alt={img.query || "Favorite"}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleFavorite(img) }}
                      className="p-1.5 rounded-full bg-red-500 text-white"
                    >
                      <Heart className="h-3.5 w-3.5" fill="currentColor" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
              <Heart className="h-16 w-16 opacity-30" />
              <p>Ainda nao tens imagens favoritas</p>
              <Button variant="outline" onClick={() => setActiveTab("search")}>
                <Search className="h-4 w-4 mr-2" />
                Explorar Imagens
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Image Preview Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          
          <div className="max-w-4xl w-full">
            <img
              src={selectedImage.url}
              alt={selectedImage.query || "Preview"}
              className="w-full max-h-[70vh] object-contain rounded-lg"
            />
            
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant="secondary">{selectedImage.source}</Badge>
                {selectedImage.author && (
                  <span className="text-sm text-white/70">por {selectedImage.author}</span>
                )}
                <span className="text-sm text-white/50">{selectedImage.width}x{selectedImage.height}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyUrl(selectedImage.url)}
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                  {copied ? "Copiado!" : "Copiar URL"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(selectedImage.url, "_blank")}
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Abrir
                </Button>
                <Button
                  size="sm"
                  onClick={() => downloadImage(selectedImage)}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
