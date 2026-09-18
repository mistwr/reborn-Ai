import type React from "react"
import { Suspense } from "react"
import type { Metadata, Viewport } from "next"
import { Inter, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Providers } from "@/components/providers"
import { RebornAnalyticsObserver } from "@/components/reborn-analytics-observer"
import { GrowthTracking } from "@/components/growth-tracking"
import { LuminBrandBridge } from "@/components/lumin-brand-bridge"
import { LuminBusinessMenu } from "@/components/lumin-business-menu"
import { LuminSecureLoginPanel } from "@/components/lumin-secure-login-panel"
import { LuminQuickTabs } from "@/components/lumin-quick-tabs"
import { LuminSidebarPruner } from "@/components/lumin-sidebar-pruner"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" })

export const metadata: Metadata = {
  title: "Lumin AI - Pensar. Criar. Realizar.",
  description:
    "Assistente de IA avançado com visão, voz, pesquisa web, geração de imagens, websites, apresentações e muito mais.",
  generator: "Lumin AI",
  keywords: ["AI", "assistente", "chatbot", "imagens", "websites", "apresentações"],
  authors: [{ name: "Lumin AI" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Lumin AI",
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
    "msapplication-TileColor": "#050507",
    "msapplication-tap-highlight": "no",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  themeColor: "#050507",
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-PT" suppressHydrationWarning className="bg-background" data-theme="dark" data-lumin-shell="phase-8">
      <head>
        <link rel="icon" type="image/svg+xml" href="/icons/lumin-ai-icon.svg?v=2" />
        <link rel="apple-touch-icon" href="/icons/icon-512x512.jpg" />
        <meta name="apple-mobile-web-app-title" content="Lumin AI" />
        <meta name="application-name" content="Lumin AI" />
        <meta name="msapplication-TileImage" content="/icons/icon-512x512.jpg" />
        <style>{`
          @media (max-width: 1023px) {
            html, body {
              max-width: 100%;
              overflow-x: clip;
            }

            div.fixed.inset-y-0.left-0.z-50.w-72.translate-x-0 {
              display: flex !important;
              visibility: visible !important;
              opacity: 1 !important;
              pointer-events: auto !important;
              transform: translateX(0) !important;
              z-index: 60 !important;
              width: clamp(18rem, 72vw, 42rem) !important;
              max-width: calc(100vw - 3rem) !important;
            }
          }

          /* Desktop hardening: mobile-only backdrops must never capture mouse clicks. */
          @media (min-width: 1024px) {
            div.fixed.inset-0.z-40[class~="lg:hidden"],
            button.fixed.inset-0.z-40[class~="lg:hidden"] {
              display: none !important;
              pointer-events: none !important;
              visibility: hidden !important;
            }

            div.fixed.inset-y-0.left-0.z-50.w-72.translate-x-0,
            aside.fixed.inset-y-0.left-0.z-50.w-72.translate-x-0 {
              pointer-events: auto !important;
              visibility: visible !important;
            }
          }
        `}</style>

        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                document.documentElement.setAttribute('data-theme', 'dark');
                document.documentElement.setAttribute('data-lumin-shell', 'phase-8');
                localStorage.setItem('luminai-theme', 'dark');
                localStorage.setItem('rebornai-theme', 'dark');
                localStorage.setItem('rebornai-tokens', '0');
                localStorage.setItem('rebornai-token-reset-date', new Date().toDateString());
                localStorage.setItem('rebornai-chat-guard-repair-v2', '1');
                localStorage.setItem('rebornai-music-intro-dismissed', 'true');
              })();

              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then(function(registration) {
                    registration.update();
                    console.log('[Lumin PWA] Service Worker registered:', registration.scope);
                  }).catch(function(error) {
                    console.log('[Lumin PWA] Service Worker registration failed:', error);
                  });
                });
              }
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} ${geistMono.variable} font-sans antialiased`}>
        <Providers>
          {children}
          <LuminQuickTabs />
          <LuminBusinessMenu />
          <LuminSecureLoginPanel />
          <LuminSidebarPruner />
        </Providers>
        <LuminBrandBridge />
        <RebornAnalyticsObserver />
        <Suspense fallback={null}>
          <GrowthTracking />
        </Suspense>
        <Analytics />
      </body>
    </html>
  )
}
