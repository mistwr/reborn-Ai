"use client"

import { useEffect } from "react"

const ACTIONABLE_SELECTOR =
  'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [role="button"], [role="tab"], [data-lumin-menu-button="true"]'

function actionableFrom(element: Element | null) {
  if (!(element instanceof HTMLElement)) return null
  const match = element.closest(ACTIONABLE_SELECTOR)
  return match instanceof HTMLElement ? match : null
}

function isEffectivelyTransparent(element: HTMLElement) {
  const style = window.getComputedStyle(element)

  if (style.pointerEvents === "none" || style.visibility === "hidden" || style.display === "none") return false

  const opacity = Number.parseFloat(style.opacity || "1")
  if (Number.isFinite(opacity) && opacity <= 0.08) return true

  const background = style.backgroundColor.replace(/\s+/g, "").toLowerCase()
  if (
    background === "transparent" ||
    background === "rgba(0,0,0,0)" ||
    background === "hsla(0,0%,0%,0)"
  ) {
    return true
  }

  return false
}

function repairPointerAt(x: number, y: number) {
  const stack = document.elementsFromPoint(x, y)
  if (!stack.length) return null

  const top = stack[0]
  const directAction = actionableFrom(top)
  if (directAction) return null

  const underlying = stack
    .slice(1)
    .map(actionableFrom)
    .find((element): element is HTMLElement => Boolean(element))

  if (!underlying) return null

  const blocker = top instanceof HTMLElement ? top : null
  if (!blocker || !isEffectivelyTransparent(blocker)) return null

  blocker.dataset.luminPointerBlockerRetired = "true"
  blocker.style.setProperty("pointer-events", "none", "important")

  return underlying
}

export function LuminDesktopPointerGuard() {
  useEffect(() => {
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)")
    if (!finePointer.matches) return

    document.documentElement.dataset.luminDesktopPointerGuard = "true"

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return

      const forwarded = repairPointerAt(event.clientX, event.clientY)
      if (!forwarded) return

      event.preventDefault()
      event.stopImmediatePropagation()

      window.setTimeout(() => {
        if (forwarded instanceof HTMLInputElement || forwarded instanceof HTMLTextAreaElement || forwarded instanceof HTMLSelectElement) {
          forwarded.focus({ preventScroll: true })
          return
        }
        forwarded.click()
      }, 0)
    }

    const onPointerMove = (event: PointerEvent) => {
      repairPointerAt(event.clientX, event.clientY)
    }

    document.addEventListener("pointerdown", onPointerDown, true)
    document.addEventListener("pointermove", onPointerMove, true)

    return () => {
      delete document.documentElement.dataset.luminDesktopPointerGuard
      document.removeEventListener("pointerdown", onPointerDown, true)
      document.removeEventListener("pointermove", onPointerMove, true)
    }
  }, [])

  return null
}
