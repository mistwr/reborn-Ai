"use client"

import { useEffect, useRef, useState } from "react"
import { WebCraftStudioV2 } from "@/components/webcraft-studio-v2"

const PREVIEW_TITLE = "Lumin AI Studio Preview"
const SAFE_MARKER = "data-lumin-safe-preview"

function hardenPreviewHtml(source: string) {
  if (!source || source.includes(SAFE_MARKER)) return source

  let safe = source

  // Preview code must never navigate the iframe back into the Lumin application.
  // Invalid generated targets such as href="null" must also never escape to localhost/null.
  safe = safe
    .replace(/(?:window\.)?location\.href\s*=\s*([^;\n]+);?/gi, "console.warn('[Lumin Preview] navigation blocked', $1);")
    .replace(/(?:window\.)?location\.assign\s*\(([^)]*)\)/gi, "console.warn('[Lumin Preview] navigation blocked', $1)")
    .replace(/(?:window\.)?location\.replace\s*\(([^)]*)\)/gi, "console.warn('[Lumin Preview] navigation blocked', $1)")
    .replace(/\b(href|action)\s*=\s*(['"])(?:null|undefined|none|nan|about:blank|\s*)\2/gi, '$1="#"')
    .replace(/\b(href|action)\s*=\s*(?:null|undefined|none|nan)(?=\s|>)/gi, '$1="#"')
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
      box.style.cssText = 'position:fixed;left:12px;right:12px;bottom:12px;z-index:2147483647;padding:12px 42px 12px 14px;border-radius:14px;background:rgba(10,10,12,.94);border:1px solid rgba(245,190,80,.35);color:#f4d27a;font:12px/1.4 system-ui,sans-serif;box-shadow:0 14px 40px rgba(0,0,0,.45)';

      var text = document.createElement('div');
      text.textContent = 'O preview encontrou um erro de JavaScript, mas o site continua disponível. Podes transferir já ou pedir ao Lumin para reparar.';
      box.appendChild(text);

      var close = document.createElement('button');
      close.type = 'button';
      close.setAttribute('aria-label', 'Fechar aviso');
      close.textContent = '×';
      close.style.cssText = 'position:absolute;right:12px;top:7px;border:0;background:transparent;color:#f4d27a;font:22px/1 system-ui;cursor:pointer';
      close.onclick = function () { box.remove(); };
      box.appendChild(close);

      document.body && document.body.appendChild(box);
      setTimeout(function () { try { box.remove(); } catch (_) {} }, 9000);
    } catch (_) {}
  }
  function invalidTarget(value) {
    var v = String(value || '').trim().toLowerCase();
    return !v || v === 'null' || v === 'undefined' || v === 'none' || v === 'nan' || v === 'about:blank';
  }
  window.addEventListener('error', function (event) {
    var target = event && event.target;
    var tag = target && target.tagName ? String(target.tagName).toUpperCase() : '';

    // Resource failures (especially remote images) are not JavaScript errors.
    if (target && target !== window && (tag === 'IMG' || tag === 'VIDEO' || tag === 'AUDIO' || tag === 'SOURCE')) {
      console.warn('[Lumin Preview] recurso visual indisponível:', target.currentSrc || target.src || '');
      return;
    }

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
    if (invalidTarget(href) || href.charAt(0) === '/' || href === '#/') {
      event.preventDefault();
      console.info('[Lumin Preview] navegação inválida/interna bloqueada:', href);
    }
  }, true);
  document.addEventListener('submit', function (event) {
    var form = event.target;
    var action = form && form.getAttribute ? (form.getAttribute('action') || '') : '';
    if (invalidTarget(action) || action.charAt(0) === '/' || action === '#/') {
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
  const [hasProject, setHasProject] = useState(false)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const syncProjectState = () => {
      const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>("button"))
      setHasProject(buttons.some((button) => button.textContent?.trim() === "HTML"))
    }

    const patchPreview = () => {
      syncProjectState()

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

  const triggerStudioAction = (label: string) => {
    const root = rootRef.current
    if (!root) return

    const button = Array.from(root.querySelectorAll<HTMLButtonElement>("button")).find(
      (candidate) => candidate.textContent?.replace(/\s+/g, " ").trim() === label,
    )

    button?.click()
  }

  return (
    <div ref={rootRef} className="contents">
      <WebCraftStudioV2 />

      {hasProject && (
        <div className="fixed inset-x-3 bottom-24 z-[95] grid grid-cols-2 gap-2 rounded-2xl border border-primary/25 bg-background/95 p-2 shadow-2xl backdrop-blur md:hidden">
          <button
            type="button"
            onClick={() => triggerStudioAction("HTML")}
            className="rounded-xl border border-primary/30 bg-primary px-3 py-3 text-sm font-semibold text-primary-foreground shadow-sm active:scale-[0.98]"
          >
            ↓ Transferir site
          </button>
          <button
            type="button"
            onClick={() => triggerStudioAction("Full-Stack ZIP")}
            className="rounded-xl border border-border bg-card px-3 py-3 text-sm font-semibold text-foreground shadow-sm active:scale-[0.98]"
          >
            ZIP completo
          </button>
          <p className="col-span-2 px-1 text-center text-[11px] text-muted-foreground">
            O download HTML está disponível diretamente no Lumin AI Studio.
          </p>
        </div>
      )}
    </div>
  )
}
