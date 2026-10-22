"use client"

import React, { useMemo } from "react"
import { hardenPreviewHtml } from "@/lib/webcraft-preview"

export function WebcraftPreview({ html }: { html: string }) {
  // Prepare before mounting: changing srcdoc from a MutationObserver starts a
  // second navigation while the first document is still loading.
  const previewHtml = useMemo(() => hardenPreviewHtml(html), [html])

  return (
    <iframe
      srcDoc={previewHtml}
      title="Lumin AI Studio Preview"
      className="h-[78vh] w-full border-0"
      sandbox="allow-scripts allow-forms allow-modals allow-popups allow-downloads"
    />
  )
}
