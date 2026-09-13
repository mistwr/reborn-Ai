"use client"

import { useEffect, useRef } from "react"
import { WebCraftStudioV2 } from "@/components/webcraft-studio-v2"

const PREVIEW_TITLE = "Lumin AI Studio Preview"
const SAFE_MARKER = "data-lumin-safe-preview"

function hardenPreviewHtml(source: string) {
  if (!source || source.includes(SAFE_MARKER)) return source

  let safe = source

  // Preview code must never navigate the iframe back into the Lumin application.
  // Keep the downloaded/generated HTML untouched; this only affects the in-app preview.
  safe = safe
    .replace(/(?:window\.)?location\.href\s*=\s*([^;\n]+);?/gi, "console.warn('[Lumin Preview] navigation blocked', $1);")
    .replace(/(?:window\.)?location\.assign\s*\(([^)]*)\)/gi, "console.warn('[Lumin Preview] navigation blocked', $1)")
    .replace(/(?:window\.)?location\.replace\s*\(([^)]*)\)/gi, "console.warn('[Lumin Preview] navigation blocked', $1)")
    .replace(/href=(['"])\/(?!\/)/gi, "href=$1#/")
    .replace(/action=(['"])\/(?!\/)/gi, "action=$1#/")

  const guard = `
<meta ${SAFE_MARKER}="1" />
<base target="_blank" />
<script>
(function () {
  function showPreviewError(message) {
    try {
      var existing = document.getElementById('lumin-preview-error');
      if (existing) return;
      var box = document.createElement('div');
      box.id = 'lumin-preview-error';
      box.style.cssText = 'position:fixed;left:12px;right:12px;bottom:12px;z-index:2147483647;padding:12px 14px;border-radius:14px;background:rgba(10,10,12,.94);border:1px solid rgba(245,190,80,.35);color:#f4d27a;font:12px/1.4 system-ui,sans-serif;box-shadow:0 14px 40px rgba(0,0,0,.45)';
      box.textContent = 'O preview encontrou um erro de JavaScript, mas o Lumin Studio continua ativo. Podes corrigir em Código ou pedir ao Lumin para reparar.';
      document.body && document.body.appendChild(box);
    } catch (_) {}
  }
  window.addEventListener('error', function (event) {
    console.warn('[Lumin Preview] erro isolado:', event && event.message);
    showPreviewError(event && event.message);
    event.preventDefault && event.preventDefault();
  }, true);
  window.addEventListener('unhandledrejection', function (event) {
    console.warn('[Lumin Preview] promise rejeitada:', event && event.reason);
    showPreviewError(String(event && event.reason || 'Erro inesperado'));
    event.preventDefault && event.preventDefault();
  });
  document.addEventListener('click', function (event) {
    var anchor = event.target && event.target.closest ? event.target.closest('a') : null;
    if (!anchor) return;
    var href = anchor.getAttribute('href') || '';
    if (href.charAt(0) === '/' || href === '#/') {
      event.preventDefault();
      console.info('[Lumin Preview] navegação interna bloqueada:', href);
    }
  }, true);
  document.addEventListener('submit', function (event) {
    var form = event.target;
    var action = form && form.getAttribute ? (form.getAttribute('action') || '') : '';
    if (!action || action.charAt(0) === '/' || action === '#/') {
      event.preventDefault();
      console.info('[Lumin Preview] submit demonstrativo bloqueado:', action);
    }
  }, true);
})();
</script>`

  if (/<head[^>]*>/i.test(safe)) {
    return safe.replace(/<head([^>]*)>/i, `<head$1>${guard}`)
  }

  if (/<html[^>]*>/i.test(safe)) {
    return safe.replace(/<html([^>]*)>/i, `<html$1><head>${guard}</head>`)
  }

  return `<!doctype html><html><head>${guard}</head><body>${safe}</body></html>`
}

export function WebCraftStudio() {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const patchPreview = () => {
      const iframe = root.querySelector<HTMLIFrameElement>(`iframe[title="${PREVIEW_TITLE}"]`)
      if (!iframe) return

      const current = iframe.getAttribute("srcdoc") || ""
      if (!current || current.includes(SAFE_MARKER)) return

      const hardened = hardenPreviewHtml(current)
      if (hardened !== current) iframe.setAttribute("srcdoc", hardened)
      iframe.setAttribute("sandbox", "allow-scripts allow-forms allow-modals allow-popups allow-downloads")
    }

    patchPreview()
    const observer = new MutationObserver(patchPreview)
    observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ["srcdoc"] })

    return () => observer.disconnect()
  }, [])

  return (
    <div ref={rootRef} className="contents">
      <WebCraftStudioV2 />
    </div>
  )
}
