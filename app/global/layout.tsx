import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Lumin AI — One AI. Any Language.",
  description:
    "Create, communicate, sell and automate with Lumin AI. Chat, Live, websites, images, marketing, clips, presentations and ebooks in one platform.",
  keywords: [
    "Lumin AI",
    "AI assistant",
    "AI website builder",
    "AI image generator",
    "AI marketing",
    "AI presentations",
    "AI ebooks",
    "multilingual AI",
  ],
  openGraph: {
    title: "Lumin AI — One AI. Any Language.",
    description:
      "Chat, Live, websites, images, marketing, clips, presentations and ebooks in one global AI platform.",
    type: "website",
    siteName: "Lumin AI",
  },
  twitter: {
    card: "summary_large_image",
    title: "Lumin AI — One AI. Any Language.",
    description:
      "Create, communicate, sell and automate with Lumin AI in one multilingual platform.",
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function GlobalLayout({ children }: { children: React.ReactNode }) {
  return children
}
