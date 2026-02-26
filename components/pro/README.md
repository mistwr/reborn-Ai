# Reborn AI Pro Module

The Pro tab is a comprehensive suite of professional tools for content creation, image generation, video editing, and document export.

## Features

### 1. WebCraft Pro
- **Template Library**: 4+ starter templates across multiple categories (landing, portfolio, blog, etc.)
- **Live Editor**: Click-to-edit HTML editing with live preview
- **Theme Builder**: Customize colors, fonts, border-radius, and gradients
- **Undo/Redo**: Full history management for edits
- **Export**: Download as HTML with applied theme

**Store**: `useWebCraftStore` manages template selection, edits, and export state

### 2. Image Generator Pro
- **Enhanced Pollinations API**: Integration with advanced parameters
- **Aspect Ratios**: Support for 1:1, 16:9, and 9:16 formats
- **Art Styles**: Fotorealista, Anime, Digital Art, Illustration, 3D
- **History Tracking**: View all previously generated images
- **Real-time Generation**: Server-side image generation with status tracking

**Store**: `useImageGeneratorStore` manages prompts, settings, and history
**API**: `/api/pro/generate-image` - POST endpoint for image generation

### 3. Clipper AI
- **FFmpeg.wasm Integration**: Browser-based video processing (with server fallback)
- **Clip Extraction**: Extract 15s, 30s, or 60s clips
- **Format Support**: Vertical, horizontal, and square formats
- **Platform Optimization**: TikTok, Instagram Reels, YouTube Shorts, YouTube formats
- **Video Library**: Store and manage generated clips

**Store**: `useCliperStore` manages video uploads, processing, and clip library
**API**: `/api/pro/process-video` - POST endpoint for video processing

### 4. Global Export
- **Multi-Format Export**: HTML, PDF, and EPUB formats
- **Theme Integration**: Apply custom themes to exports
- **Chapter Management**: Automatic chapter splitting for EPUB (configurable size)
- **Metadata**: Title and author customization
- **Image Preservation**: Embedded images in PDF and EPUB exports

**Export Utilities**: `exportToHTML()`, `exportToPDF()`, `exportToEPUB()`
**Theme Builder**: Preset themes and custom color picker

## File Structure

```
components/pro/
├── index.ts                          # Public exports
├── webcraft-pro-tab.tsx              # WebCraft main component
├── template-library.tsx              # Template browser & selection
├── live-editor.tsx                   # HTML editor with preview
├── image-generator-pro-tab.tsx       # Image generation UI
├── clipper-ai-tab.tsx                # Video clipping UI
└── global-export-tab.tsx             # Export/theme UI

lib/
├── stores/
│   ├── webcraft-store.ts             # WebCraft state management
│   ├── image-generator-store.ts      # Image generator state
│   └── clipper-store.ts              # Clipper AI state
├── templates.ts                      # Template definitions
├── theme-builder.ts                  # Theme utilities
└── export-utils.ts                   # Export functions

app/api/pro/
├── generate-image/
│   └── route.ts                      # Image generation API
└── process-video/
    └── route.ts                      # Video processing API
```

## State Management

All modules use Zustand for state management. Each store is independent:

- **WebCraftStore**: Template selection, HTML editing, export
- **ImageGeneratorStore**: Prompts, settings, generation history
- **CliperStore**: Video upload, clip library, format settings

## API Routes

### POST /api/pro/generate-image
Generates images using Pollinations API

Request:
```json
{
  "prompt": "A futuristic city with neon lights",
  "aspectRatio": "16:9",
  "style": "Fotorealista"
}
```

Response:
```json
{
  "imageUrl": "https://..."
}
```

### POST /api/pro/process-video
Processes videos and extracts clips

Request (FormData):
- `video`: File (video file)
- `duration`: 15 | 30 | 60 (seconds)
- `format`: 'vertical' | 'horizontal' | 'square'
- `platform`: 'tiktok' | 'reels' | 'shorts' | 'youtube'

Response:
```json
{
  "videoUrl": "/api/pro/videos/..."
}
```

## Dependencies Added

- `zustand@^4.4.7` - State management
- `html2pdf.js@^0.10.1` - PDF export
- `html2epub@^1.0.0` - EPUB export
- `@ffmpeg/ffmpeg@^0.12.6` - Video processing
- `@ffmpeg/util@^0.12.1` - FFmpeg utilities
- `react-easy-crop@^10.1.3` - Image cropping (future use)
- `unsplash-js@^7.0.0` - Image search (future use)

## Integration with Main App

The Pro tab is integrated into the main page as a new tab alongside Chat, Live, Images, etc. It appears as a Crown icon labeled "Pro" in the tab bar.

Access via: Main page → Pro tab → Select sub-module

## Development Notes

1. **Browser Limitations**: FFmpeg.wasm may have file size limitations. Server-side fallback is implemented.
2. **CORS**: Image exports require proper CORS handling for external images.
3. **Storage**: Generated images, clips, and exports are stored in-memory. For production, integrate with Vercel Blob or similar service.
4. **Performance**: Large HTML exports may cause brief freezing. Consider Web Workers for heavy processing.

## Future Enhancements

- Integration with Unsplash API for image search in template builder
- Advanced image cropping and manipulation tools
- Multi-file batch processing for video clips
- Real-time collaboration for document editing
- Cloud storage integration for exports
