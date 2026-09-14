"use client"

import { useEffect } from "react"

const REPLACEMENTS: Array<[RegExp, string]> = [
  [/REBORN AI/gi, "Lumin AI"],
  [/Reborn AI/gi, "Lumin AI"],
]

const LUMIN_PALETTE: Record<string, string> = {
  "--background": "#030303",
  "--foreground": "#f7f3ea",
  "--card": "#090806",
  "--card-foreground": "#f7f3ea",
  "--popover": "#090806",
  "--popover-foreground": "#f7f3ea",
  "--primary": "#d6a84b",
  "--primary-foreground": "#080603",
  "--secondary": "#12100c",
  "--secondary-foreground": "#eee6d4",
  "--muted": "#17140f",
  "--muted-foreground": "#8f887a",
  "--accent": "#e5bc63",
  "--accent-foreground": "#080603",
  "--border": "#262117",
  "--input": "#100e0b",
  "--ring": "#d6a84b",
  "--sidebar": "#050504",
  "--sidebar-foreground": "#eee8dc",
  "--sidebar-primary": "#d6a84b",
  "--sidebar-primary-foreground": "#080603",
  "--sidebar-accent": "#15120d",
  "--sidebar-accent-foreground": "#f7f3ea",
  "--sidebar-border": "#211c14",
  "--sidebar-ring": "#d6a84b",
}

function replaceBrand(value: string) {
  return REPLACEMENTS.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), value)
}

function updateElement(element: Element) {
  for (const attribute of ["title", "aria-label", "placeholder"]) {
    const value = element.getAttribute(attribute)
    if (!value || !/reborn ai/i.test(value)) continue
    element.setAttribute(attribute, replaceBrand(value))
  }
}

function updateNode(node: Node) {
  if (node.nodeType === Node.TEXT_NODE) {
    const parent = node.parentElement
    if (!parent || ["SCRIPT", "STYLE"].includes(parent.tagName)) return

    const value = node.nodeValue
    if (value && /reborn ai/i.test(value)) node.nodeValue = replaceBrand(value)
    return
  }

  if (!(node instanceof Element)) return

  updateElement(node)
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT)
  let current = walker.nextNode()
  while (current) {
    updateNode(current)
    current = walker.nextNode()
  }

  node.querySelectorAll("[title], [aria-label], [placeholder]").forEach(updateElement)
}

function applyLuminVisualIdentity() {
  const root = document.documentElement
  root.dataset.luminShell = "true"

  for (const [property, value] of Object.entries(LUMIN_PALETTE)) {
    root.style.setProperty(property, value)
  }

  // A nova shell tem uma identidade única. Temas históricos continuam guardados
  // apenas para compatibilidade, mas deixam de dominar a experiência principal.
  root.setAttribute("data-theme", "dark")
  try {
    localStorage.setItem("luminai-theme", "dark")
  } catch {}
}

export function LuminBrandBridge() {
  useEffect(() => {
    applyLuminVisualIdentity()
    updateNode(document.body)

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") {
          updateNode(mutation.target)
          continue
        }
        mutation.addedNodes.forEach(updateNode)
      }
    })

    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
    })

    return () => observer.disconnect()
  }, [])

  return null
}
