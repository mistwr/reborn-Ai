/**
 * REBORN AI CLIPPER - Cloudflare Worker com FFmpeg WASM
 *
 * ========================================
 * INSTRUÇÕES DE DEPLOY
 * ========================================
 *
 * 1. Instalar Wrangler CLI:
 *    npm install -g wrangler
 *
 * 2. Criar novo projeto:
 *    wrangler init clipper-worker
 *
 * 3. Copiar este ficheiro para src/index.ts
 *
 * 4. Configurar wrangler.toml:
 *    name = "clipper-worker"
 *    main = "src/index.ts"
 *    compatibility_date = "2024-01-01"
 *
 *    [vars]
 *    ALLOWED_ORIGIN = "https://your-reborn-ai.vercel.app"
 *
 *    [[r2_buckets]]
 *    binding = "CLIPS_BUCKET"
 *    bucket_name = "reborn-clips"
 *
 * 5. Criar bucket R2 (para armazenar clips):
 *    wrangler r2 bucket create reborn-clips
 *
 * 6. Deploy:
 *    wrangler deploy
 *
 * 7. Adicionar URL do Worker ao Vercel:
 *    CLOUDFLARE_CLIPPER_WORKER_URL=https://clipper-worker.your-account.workers.dev
 *
 * ========================================
 * LIMITAÇÕES
 * ========================================
 *
 * - Cloudflare Workers tem limite de 128MB RAM
 * - FFmpeg WASM é lento comparado com FFmpeg nativo
 * - Vídeos muito grandes podem dar timeout
 * - Recomendado para vídeos até 100MB / 10 min
 *
 * ALTERNATIVA PARA VÍDEOS GRANDES:
 * - Usar Cloudflare Workers + Durable Objects
 * - Ou serviço dedicado como AWS Lambda com FFmpeg Layer
 */

// NOTA: Este código é um template para deploy em Cloudflare Workers
// Requer configuração adicional conforme instruções acima

import type { R2Bucket } from "@cloudflare/workers-types"

interface Env {
  CLIPS_BUCKET: R2Bucket
  ALLOWED_ORIGIN: string
}

interface Moment {
  startTime: number
  endTime: number
  text: string
  score: number
  title: string
  hashtags: string[]
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    }

    // Handle preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders })
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", {
        status: 405,
        headers: corsHeaders,
      })
    }

    try {
      const formData = await request.formData()
      const videoFile = formData.get("video") as File | null
      const momentsJson = formData.get("moments") as string
      const addSubtitles = formData.get("addSubtitles") === "true"
      const format916 = formData.get("format916") === "true"

      if (!videoFile || !momentsJson) {
        return new Response(JSON.stringify({ error: "Missing video or moments" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      const moments: Moment[] = JSON.parse(momentsJson)

      // Processar vídeo com FFmpeg WASM
      // NOTA: Em produção, importar @ffmpeg/ffmpeg e processar
      const clips = await processVideoClips(videoFile, moments, addSubtitles, format916, env)

      return new Response(JSON.stringify({ clips, processed: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    } catch (error) {
      console.error("Worker error:", error)
      return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }
  },
}

/**
 * Processa os clips do vídeo
 *
 * IMPLEMENTAÇÃO COMPLETA REQUER:
 * 1. Importar FFmpeg WASM
 * 2. Carregar o vídeo na memória
 * 3. Para cada momento:
 *    - Cortar o segmento
 *    - Redimensionar para 9:16 se necessário
 *    - Adicionar legendas se necessário
 *    - Exportar como MP4
 * 4. Upload para R2
 * 5. Retornar URLs públicos
 */
async function processVideoClips(
  videoFile: File,
  moments: Moment[],
  addSubtitles: boolean,
  format916: boolean,
  env: Env,
) {
  // Template de implementação
  // Em produção, usar FFmpeg WASM real

  const clips = []

  for (let i = 0; i < moments.length; i++) {
    const moment = moments[i]
    const clipId = `clip-${Date.now()}-${i}`

    // Placeholder para o clip processado
    // Em produção:
    // 1. ffmpeg.run('-i', inputFile, '-ss', startTime, '-to', endTime, ...)
    // 2. Upload para R2: await env.CLIPS_BUCKET.put(clipId, clipData)
    // 3. Gerar URL público

    clips.push({
      id: clipId,
      url: `https://pub-xxxxx.r2.dev/${clipId}.mp4`, // URL R2 público
      thumbnail: `https://pub-xxxxx.r2.dev/${clipId}-thumb.jpg`,
      duration: moment.endTime - moment.startTime,
      startTime: moment.startTime,
      endTime: moment.endTime,
      transcript: moment.text,
      viralScore: moment.score,
      title: moment.title,
      hashtags: moment.hashtags,
    })
  }

  return clips
}

/**
 * Código FFmpeg WASM para referência
 *
 * import { FFmpeg } from '@ffmpeg/ffmpeg'
 * import { fetchFile } from '@ffmpeg/util'
 *
 * const ffmpeg = new FFmpeg()
 * await ffmpeg.load()
 *
 * // Escrever ficheiro de entrada
 * await ffmpeg.writeFile('input.mp4', await fetchFile(videoFile))
 *
 * // Cortar clip
 * await ffmpeg.exec([
 *   '-i', 'input.mp4',
 *   '-ss', startTime.toString(),
 *   '-to', endTime.toString(),
 *   '-c:v', 'libx264',
 *   '-c:a', 'aac',
 *   '-vf', 'scale=1080:1920,setsar=1:1', // 9:16
 *   'output.mp4'
 * ])
 *
 * // Ler resultado
 * const data = await ffmpeg.readFile('output.mp4')
 */
