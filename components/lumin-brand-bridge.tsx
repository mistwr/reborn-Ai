"use client"

import { useEffect, useState } from "react"
import { LuminOrb } from "@/components/lumin-orb"

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

function isLivePanelVisible() {
  const activePanel = document.querySelector<HTMLElement>('[role="tabpanel"][data-state="active"]')
  if (!activePanel) return false
  return /modo live|iniciar live|terminar/i.test(activePanel.innerText || "")
}

export function LuminBrandBridge() {
  const [liveSpeaking, setLiveSpeaking] = useState(false)

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

    observer.observe(document.body, { subtree: true, childList: true, characterData: true })

    const speechWatch = window.setInterval(() => {
      const speaking = Boolean(window.speechSynthesis?.speaking)
      setLiveSpeaking(speaking && isLivePanelVisible())
    }, 120)

    return () => {
      observer.disconnect()
      window.clearInterval(speechWatch)
    }
  }, [])

  return liveSpeaking ? (
    <div className="pointer-events-none fixed inset-x-0 top-20 z-[100] flex justify-center md:top-24">
      <div className="rounded-[28px] border border-[#e8bd61]/20 bg-black/55 px-4 py-3 shadow-[0_0_55px_rgba(218,171,76,.24)] backdrop-blur-xl">
        <LuminOrb state="speaking" level={0.85} size={170} showLabel />
        <div className="-mt-1 text-center text-[11px] uppercase tracking-[.24em] text-zinc-500">Resposta em tempo real</div>
      </div>
    </div>
  ) : null
}
