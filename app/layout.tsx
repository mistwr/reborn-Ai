import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Providers } from "@/components/providers"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" })

export const metadata: Metadata = {
  title: "Reborn AI - Assistente Inteligente",
  description:
    "Assistente de IA avançado com visão, voz, pesquisa web, geração de imagens, websites, apresentações e muito mais.",
  generator: "Reborn AI",
  keywords: ["AI", "assistente", "chatbot", "imagens", "websites", "apresentações"],
  authors: [{ name: "Reborn AI" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Reborn AI",
    startupImage: [
      {
        url: "/icons/icon-512x512.jpg",
        media: "(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)",
      },
    ],
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "msapplication-TileColor": "#7c3aed",
    "msapplication-tap-highlight": "no",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  themeColor: "#0a0a0f",
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt" suppressHydrationWarning className="bg-background">
      <head>
        {/* PWA Meta Tags */}
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-512x512.jpg" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/icon-512x512.jpg" />
        <link rel="apple-touch-icon" href="/icons/icon-512x512.jpg" />
        <link rel="mask-icon" href="/icons/icon-512x512.jpg" color="#7c3aed" />
        <meta name="apple-mobile-web-app-title" content="Reborn AI" />
        <meta name="application-name" content="Reborn AI" />
        <meta name="msapplication-TileImage" content="/icons/icon-512x512.jpg" />
        
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                document.documentElement.classList.add('dark');
              })();
              
              // Register Service Worker
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(registration) {
                    console.log('[PWA] Service Worker registered:', registration.scope);
                  }).catch(function(error) {
                    console.log('[PWA] Service Worker registration failed:', error);
                  });
                });
              }
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} ${geistMono.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  )
}
