"use client"

import { useEffect } from "react"

const COMPOSER_SELECTOR = 'input[placeholder="Escreve uma mensagem..."]'

function repairComposerInput() {
  const input = document.querySelector(COMPOSER_SELECTOR)
  if (!(input instanceof HTMLInputElement)) return

  // The chat input must remain directly editable. The send button may stay
  // disabled while a response is loading, but the keyboard should still open.
  if (input.disabled) input.disabled = false
  if (input.readOnly) input.readOnly = false
  input.style.setProperty("pointer-events", "auto", "important")
  input.style.setProperty("touch-action", "manipulation", "important")
  input.style.setProperty("user-select", "text", "important")
  input.style.setProperty("-webkit-user-select", "text", "important")
}

export function LuminNativeComposerFocusGuard() {
  useEffect(() => {
    const onPointerDown = (event: Event) => {
      const target = event.target
      if (!(target instanceof HTMLInputElement) || !target.matches(COMPOSER_SELECTOR)) return

      repairComposerInput()
      window.setTimeout(() => {
        target.focus({ preventScroll: true })
        try {
          const end = target.value.length
          target.setSelectionRange(end, end)
        } catch {}
      }, 0)
    }

    repairComposerInput()

    const observer = new MutationObserver(repairComposerInput)
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["disabled", "readonly", "class", "style"],
    })

    const interval = window.setInterval(repairComposerInput, 250)
    document.addEventListener("pointerdown", onPointerDown, true)
    document.addEventListener("touchstart", onPointerDown, true)

    return () => {
      observer.disconnect()
      window.clearInterval(interval)
      document.removeEventListener("pointerdown", onPointerDown, true)
      document.removeEventListener("touchstart", onPointerDown, true)
    }
  }, [])

  return null
}
