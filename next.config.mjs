/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  env: {
    // Safe, non-secret model identifier. Legacy routes that still read
    // process.env.AI_MODEL inherit the same verified default as lib/ai-config.
    AI_MODEL: process.env.AI_MODEL || "google/gemini-2.5-flash-lite",
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
}

export default nextConfig
