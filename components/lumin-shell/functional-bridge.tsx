"use client"

import type { FormEvent } from "react"
import { useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import {
  BookOpen,
  Crown,
  Eye,
  Globe,
  Image as ImageIcon,
  Images,
  Megaphone,
  MessageSquare,
  Presentation,
  Radio,
  Scissors,
  Sparkles,
  Video,
} from "lucide-react"
import { LuminShellComposer } from "@/components/lumin-shell/composer"
import { LuminShellSidebar, type LuminShellNavItem } from "@/components/lumin-shell/sidebar"

const NAV_DEFINITIONS = [
  { id: "chat", labels: ["chat", "conversa"], label: "Chat", icon: MessageSquare },
  { id: "live", labels: ["live", "modo live"], label: "Live", icon: Radio },
  { id: "vision", labels: ["vision", "visão", "visao", "analisar"], label: "Analisar", icon: Eye },
  { id: "images", labels: ["imagens", "gerar imagens", "imagem"], label: "Gerar Imagens", icon: ImageIcon },
  { id: "imagebank", labels: ["banco de imagens", "image bank"], label: "Banco de Imagens", icon: Images },
  { id: "imageenhancer", labels: ["melhorar imagem", "melhorador", "enhancer"], label: "Melhorar Imagem", icon: Sparkles },
  { id: "webcraft", labels: ["webcraft", "website", "sites"], label: "WebCraft", icon: Globe },
  { id: "presentations", labels: ["apresentações", "apresentacoes", "slides"], label: "Apresentações", icon: Presentation },
  { id: "ebooks", labels: ["ebooks", "ebook", "livros"], label: "Ebooks", icon: BookOpen },
  { id: "clipper", labels: ["clipper", "clips"], label: "Clipper", icon: Scissors },
  { id: "marketing", labels: ["marketing"], label: "Marketing", icon: Megaphone },
  { id: "messaging", labels: ["mensagens", "messaging", "sms", "whatsapp"], label: "Mensagens", icon: Video },
  { id: "pro", labels: ["pro"], label: "Pro", icon: Crown },
] as const

function normalise(value: string) {
  return value
    .toLocaleLowerCase("pt-PT")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function findLegacySidebar() {
  return Array.from(document.querySelectorAll("div")).find((element): element is HTMLDivElement => {
    if (!(element instanceof HTMLDivElement)) return false
    const className = element.className
    return (
      typeof className === "string" &&
      className.includes("fixed") &&
      className.includes("inset-y-0") &&
      className.includes("left-0") &&
      className.includes("w-72") &&
      className.includes("translate-x")
    )
  }) ?? null
}

function findLegacyComposer() {
  const input = document.querySelector('input[placeholder="Escreve uma mensagem..."]')
  if (!(input instanceof HTMLInputElement)) return null

  const form = input.closest("form")
  if (!(form instanceof HTMLFormElement)) return null

  let area: HTMLElement | null = form.parentElement
  while (area && area.parentElement && !String(area.className).includes("border-t")) {
    area = area.parentElement
  }

  if (!area || !area.parentElement) return null
  return { input, form, area, mountTarget: area.parentElement }
}

function findButtonByIcon(root: Element, iconClass: string) {
  const icon = root.querySelector(`svg.${iconClass}`)
  const button = icon?.closest("button")
  return button instanceof HTMLButtonElement ? button : null
}

function setReactInputValue(input: HTMLInputElement, value: string) {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")
  descriptor?.set?.call(input, value)
  input.dispatchEvent(new Event("input", { bubbles: true }))
}

export function LuminShellFunctionalBridge() {
  const [legacySidebar, setLegacySidebar] = useState<HTMLElement | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeId, setActiveId] = useState("chat")
  const [composerMountTarget, setComposerMountTarget] = useState<HTMLElement | null>(null)
  const [composerValue, setComposerValue] = useState("")
  const [composerDisabled, setComposerDisabled] = useState(false)
  const [hasAttachment, setHasAttachment] = useState(false)
  const [micActive, setMicActive] = useState(false)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let cancelled = false
    let retries = 0
    let sidebarObserver: MutationObserver | null = null
    let documentObserver: MutationObserver | null = null
    let poll: number | null = null
    let currentSidebar: HTMLElement | null = null
    let currentComposer: ReturnType<typeof findLegacyComposer> = null

    const syncSidebar = () => {
      const sidebar = currentSidebar
      if (!sidebar) return

      const classes = String(sidebar.className)
      setSidebarOpen(classes.includes("translate-x-0") && !classes.includes("-translate-x-full"))

      const buttons = Array.from(sidebar.querySelectorAll("button"))
      for (const definition of NAV_DEFINITIONS) {
        const match = buttons.find((button) => {
          const text = normalise(button.textContent ?? "")
          return definition.labels.some((label) => text === normalise(label) || text.startsWith(`${normalise(label)} `))
        })
        if (match && /bg-white\/10|bg-primary|text-white/.test(String(match.className))) {
          setActiveId(definition.id)
          break
        }
      }
    }

    const syncComposer = () => {
      const composer = currentComposer
      if (!composer) return

      setComposerValue((current) => (current === composer.input.value ? current : composer.input.value))
      const submitButton = composer.form.querySelector('button[type="submit"]')
      setComposerDisabled(submitButton instanceof HTMLButtonElement ? submitButton.disabled : false)
      const fileInput = composer.form.querySelector('input[type="file"]')
      setHasAttachment(fileInput instanceof HTMLInputElement ? Boolean(fileInput.files?.length) : false)
      const micButton = findButtonByIcon(composer.form, "lucide-mic") ?? findButtonByIcon(composer.form, "lucide-mic-off")
      setMicActive(Boolean(micButton && String(micButton.className).includes("bg-red-500")))
    }

    const attach = () => {
      if (cancelled) return

      const sidebar = findLegacySidebar()
      const composer = findLegacyComposer()

      if (!sidebar || !composer) {
        retries += 1
        if (retries < 60) window.setTimeout(attach, 125)
        return
      }

      currentSidebar = sidebar
      currentComposer = composer

      sidebar.dataset.luminLegacySidebar = "true"
      sidebar.style.visibility = "hidden"
      sidebar.style.pointerEvents = "none"

      composer.area.dataset.luminLegacyComposer = "true"
      composer.area.style.display = "none"

      setLegacySidebar(sidebar)
      setComposerMountTarget(composer.mountTarget)
      setVersion((value) => value + 1)
      syncSidebar()
      syncComposer()

      sidebarObserver = new MutationObserver(syncSidebar)
      sidebarObserver.observe(sidebar, { attributes: true, subtree: true, attributeFilter: ["class"] })

      documentObserver = new MutationObserver(() => {
        const nextComposer = findLegacyComposer()
        if (nextComposer && nextComposer.area !== currentComposer?.area) {
          if (currentComposer?.area) {
            currentComposer.area.style.removeProperty("display")
            delete currentComposer.area.dataset.luminLegacyComposer
          }
          currentComposer = nextComposer
          nextComposer.area.dataset.luminLegacyComposer = "true"
          nextComposer.area.style.display = "none"
          setComposerMountTarget(nextComposer.mountTarget)
          setVersion((value) => value + 1)
        }
      })
      documentObserver.observe(document.body, { childList: true, subtree: true })

      poll = window.setInterval(() => {
        syncSidebar()
        syncComposer()
      }, 250)
    }

    attach()

    return () => {
      cancelled = true
      sidebarObserver?.disconnect()
      documentObserver?.disconnect()
      if (poll) window.clearInterval(poll)
      if (currentSidebar) {
        currentSidebar.style.removeProperty("visibility")
        currentSidebar.style.removeProperty("pointer-events")
        delete currentSidebar.dataset.luminLegacySidebar
      }
      if (currentComposer?.area) {
        currentComposer.area.style.removeProperty("display")
        delete currentComposer.area.dataset.luminLegacyComposer
      }
    }
  }, [])

  const legacyNavigation = useMemo(() => {
    if (!legacySidebar) return new Map<string, HTMLButtonElement>()
    const buttons = Array.from(legacySidebar.querySelectorAll("button"))
    const map = new Map<string, HTMLButtonElement>()

    for (const definition of NAV_DEFINITIONS) {
      const match = buttons.find((button) => {
        const text = normalise(button.textContent ?? "")
        return definition.labels.some((label) => text === normalise(label) || text.startsWith(`${normalise(label)} `))
      })
      if (match instanceof HTMLButtonElement) map.set(definition.id, match)
    }

    return map
  }, [legacySidebar, version])

  const navItems = useMemo<LuminShellNavItem[]>(
    () => NAV_DEFINITIONS.filter((item) => legacyNavigation.has(item.id)).map(({ id, label, icon }) => ({ id, label, icon })),
    [legacyNavigation],
  )

  const closeSidebar = () => {
    if (!legacySidebar) return
    const close = findButtonByIcon(legacySidebar, "lucide-x")
    if (close) close.click()
    else if (sidebarOpen) document.querySelector<HTMLButtonElement>('button[aria-label="Abrir menu Lumin"]')?.click()
  }

  const selectNavigation = (id: string) => {
    legacyNavigation.get(id)?.click()
    setActiveId(id)
  }

  const composer = findLegacyComposer()

  const changeComposer = (value: string) => {
    setComposerValue(value)
    const current = findLegacyComposer()
    if (current) setReactInputValue(current.input, value)
  }

  const submitComposer = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const current = findLegacyComposer()
    if (!current) return
    if (composerValue !== current.input.value) setReactInputValue(current.input, composerValue)
    current.form.requestSubmit()
  }

  const clickComposerAction = (icon: string) => {
    const current = findLegacyComposer()
    if (!current) return
    findButtonByIcon(current.form, icon)?.click()
  }

  return (
    <>
      {legacySidebar
        ? createPortal(
            <LuminShellSidebar
              open={sidebarOpen}
              onClose={closeSidebar}
              items={navItems}
              activeId={activeId}
              onSelect={selectNavigation}
            />,
            document.body,
          )
        : null}

      {composerMountTarget && composer
        ? createPortal(
            <LuminShellComposer
              value={composerValue}
              onChange={changeComposer}
              onSubmit={submitComposer}
              onImage={() => clickComposerAction("lucide-image")}
              onMic={() => clickComposerAction(micActive ? "lucide-mic-off" : "lucide-mic")}
              disabled={composerDisabled}
              canSubmit={hasAttachment}
              attachmentActive={hasAttachment}
              micActive={micActive}
            />,
            composerMountTarget,
          )
        : null}
    </>
  )
}
