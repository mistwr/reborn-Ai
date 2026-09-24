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

          /*
           * Desktop hardening: mobile-only backdrops must never capture mouse
           * clicks.  Do not rely only on viewport width: a PC with browser zoom
           * or a narrow window can report <1024px while still using a mouse.
           */
          @media (min-width: 1024px), (hover: hover) and (pointer: fine) {
            [data-lumin-mobile-backdrop="true"],
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

              /*
               * Pre-hydration desktop click repair.  This runs independently of
               * React so a stale/legacy mobile backdrop can never freeze the PC
               * interface, even with browser zoom or a narrow desktop window.
               */
              (function() {
                var desktopPointer = window.matchMedia('(hover: hover) and (pointer: fine)');

                function retireMobileBackdrops() {
                  if (!desktopPointer.matches && window.innerWidth < 1024) return;

                  document.querySelectorAll(
                    '[data-lumin-mobile-backdrop="true"], div.fixed.inset-0.z-40[class~="lg:hidden"], button.fixed.inset-0.z-40[class~="lg:hidden"]'
                  ).forEach(function(element) {
                    element.style.setProperty('display', 'none', 'important');
                    element.style.setProperty('pointer-events', 'none', 'important');
                    element.style.setProperty('visibility', 'hidden', 'important');
                  });
                }

                function startDesktopInteractionGuard() {
                  retireMobileBackdrops();
                  var observer = new MutationObserver(retireMobileBackdrops);
                  observer.observe(document.body, { childList: true, subtree: true });
                  window.addEventListener('resize', retireMobileBackdrops, { passive: true });
                  if (desktopPointer.addEventListener) desktopPointer.addEventListener('change', retireMobileBackdrops);
                }

                if (document.readyState === 'loading') {
                  document.addEventListener('DOMContentLoaded', startDesktopInteractionGuard, { once: true });
                } else {
                  startDesktopInteractionGuard();
                }
              })();

              /*
               * If the HTML/CSS render but React never hydrates, hover effects
               * still work while every click appears dead. Repair that state
               * automatically by dropping stale Lumin caches/service workers
               * once and forcing a clean navigation.
               */
              (function() {
                var repairKey = 'lumin-hydration-repair-v1';

                function hasHydrated() {
                  return document.documentElement.getAttribute('data-lumin-hydrated') === 'true';
                }

                function alreadyRepaired() {
                  try { return sessionStorage.getItem(repairKey) === '1'; }
                  catch (_) { return true; }
                }

                function markRepair() {
                  try { sessionStorage.setItem(repairKey, '1'); } catch (_) {}
                }

                function cleanUrl() {
                  var url = new URL(window.location.href);
                  url.searchParams.set('lumin_repair', '1');
                  return url.pathname + url.search + url.hash;
                }

                function recoverHydration() {
                  if (hasHydrated() || alreadyRepaired()) return;
                  markRepair();

                  var jobs = [];

                  if ('caches' in window) {
                    jobs.push(
                      caches.keys().then(function(names) {
                        return Promise.all(
                          names
                            .filter(function(name) { return name.indexOf('lumin-ai-') === 0; })
                            .map(function(name) { return caches.delete(name); })
                        );
                      }).catch(function() {})
                    );
                  }

                  if ('serviceWorker' in navigator && navigator.serviceWorker.getRegistrations) {
                    jobs.push(
                      navigator.serviceWorker.getRegistrations().then(function(registrations) {
                        return Promise.all(registrations.map(function(registration) {
                          return registration.unregister().catch(function() {});
                        }));
                      }).catch(function() {})
                    );
                  }

                  Promise.all(jobs).finally(function() {
                    window.location.replace(cleanUrl());
                  });
                }

                window.addEventListener('load', function() {
                  window.setTimeout(function() {
                    if (!hasHydrated()) recoverHydration();
                  }, 5000);
                });

                document.addEventListener('click', function(event) {
                  var target = event.target;
                  if (!(target instanceof Element)) return;
                  var menu = target.closest('[data-lumin-menu-button="true"]');
                  if (menu && !hasHydrated()) {
                    event.preventDefault();
                    recoverHydration();
                  }
                }, true);
              })();

              /*
               * Opt-in desktop diagnostic. Only runs with ?pcdebug=1 and sends
               * coarse technical events to server logs so we can distinguish
               * blocked JavaScript, failed hydration and swallowed clicks.
               */
              (function() {
                try {
                  if (new URLSearchParams(window.location.search).get('pcdebug') !== '1') return;

                  function describeTarget(target) {
                    if (!(target instanceof Element)) return '';
                    var tag = target.tagName.toLowerCase();
                    var id = target.id ? '#' + target.id : '';
                    var cls = typeof target.className === 'string'
                      ? '.' + target.className.split(/\s+/).filter(Boolean).slice(0, 4).join('.')
                      : '';
                    var text = (target.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80);
                    return tag + id + cls + (text ? ' :: ' + text : '');
                  }

                  function send(stage, extra) {
                    var payload = Object.assign({
                      stage: stage,
                      href: window.location.href,
                      userAgent: navigator.userAgent,
                      hydrated: document.documentElement.getAttribute('data-lumin-hydrated') === 'true',
                      ts: new Date().toISOString()
                    }, extra || {});

                    fetch('/api/pc-probe', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(payload),
                      keepalive: true,
                      cache: 'no-store'
                    }).catch(function() {});
                  }

                  send('inline_loaded');

                  window.addEventListener('error', function(event) {
                    send('window_error', { detail: String(event.message || event.error || 'unknown_error') });
                  });

                  window.addEventListener('unhandledrejection', function(event) {
                    send('unhandled_rejection', { detail: String(event.reason || 'unknown_rejection') });
                  });

                  window.addEventListener('lumin:hydrated', function() {
                    send('react_hydrated');
                  });

                  document.addEventListener('pointerdown', function(event) {
                    send('pointerdown', { target: describeTarget(event.target) });
                  }, true);

                  document.addEventListener('click', function(event) {
                    send('click', { target: describeTarget(event.target) });
                  }, true);

                  window.addEventListener('load', function() {
                    send('window_load');
                    window.setTimeout(function() { send('after_5s'); }, 5000);
                  });
                } catch (_) {}
              })();

              /*
               * Temporarily retire legacy service workers. A subset of Windows
               * Chrome clients retained an older Lumin worker and produced a
               * mixed server/client shell. That shows up as React #418 and can
               * leave the page visually loaded while actions appear inert.
               */
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.getRegistrations().then(function(registrations) {
                    return Promise.all(registrations.map(function(registration) {
                      return registration.unregister().catch(function() { return false; });
                    }));
                  }).catch(function() {});

                  if ('caches' in window) {
                    caches.keys().then(function(names) {
                      return Promise.all(
                        names
                          .filter(function(name) { return name.indexOf('lumin-ai-') === 0; })
                          .map(function(name) { return caches.delete(name); })
                      );
                    }).catch(function() {});
                  }
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
