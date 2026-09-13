"use client"

import { useEffect } from "react"

const REPLACEMENTS: Array<[RegExp, string]> = [
  [/REBORN AI/gi, "Lumin AI"],
  [/Reborn AI/gi, "Lumin AI"],
]

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

export function LuminBrandBridge() {
  useEffect(() => {
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
