import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Reborn AI — One AI. Any Language.",
  description:
    "Create, communicate, sell and automate with Reborn AI. Chat, Live, websites, images, marketing, clips, presentations and ebooks in one platform.",
  keywords: [
    "Reborn AI",
    "AI assistant",
    "AI website builder",
    "AI image generator",
    "AI marketing",
    "AI presentations",
    "AI ebooks",
    "multilingual AI",
  ],
  openGraph: {
    title: "Reborn AI — One AI. Any Language.",
    description:
      "Chat, Live, websites, images, marketing, clips, presentations and ebooks in one global AI platform.",
    type: "website",
    siteName: "Reborn AI",
  },
  twitter: {
    card: "summary_large_image",
    title: "Reborn AI — One AI. Any Language.",
    description:
      "Create, communicate, sell and automate with Reborn AI in one multilingual platform.",
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function GlobalLayout({ children }: { children: React.ReactNode }) {
  return children
}
