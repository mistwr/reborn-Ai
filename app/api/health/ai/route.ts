import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  const host = process.env.VERCEL
    ? "vercel"
    : process.env.NETLIFY
      ? "netlify"
      : process.env.NODE_ENV === "development"
        ? "development"
        : "unknown"

  const directProviders = {
    openai: Boolean(process.env.OPENAI_API_KEY?.trim()),
    google: Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim()),
    huggingface: Boolean(process.env.HUGGINGFACE_API_KEY?.trim()),
  }

  const gateway = {
    configured: Boolean(process.env.AI_GATEWAY_API_KEY?.trim()),
    model: process.env.AI_MODEL || "google/gemini-2.5-flash-lite",
  }

  return NextResponse.json(
    {
      ok: gateway.configured || Object.values(directProviders).some(Boolean) || host === "vercel",
      product: "Lumin AI",
      host,
      gateway,
      directProviders,
      note:
        host === "netlify" && !gateway.configured && !Object.values(directProviders).some(Boolean)
          ? "Este ambiente não tem credenciais de IA configuradas; o chat entra em Modo Resiliência."
          : "O runtime tem pelo menos uma rota de IA potencialmente disponível.",
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  )
}
