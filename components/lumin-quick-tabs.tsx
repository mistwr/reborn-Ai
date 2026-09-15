"use client"

import { useState } from "react"
import { ChevronDown, Image as ImageIcon, MessageSquare, Plus, Share2, Wrench } from "lucide-react"

type GroupId = "create" | "tools" | "social" | "more"

type ToolLink = {
  label: string
  aliases: string[]
}

const GROUPS: Record<GroupId, { label: string; items: ToolLink[] }> = {
  create: {
    label: "Criar",
    items: [
      { label: "Gerar Imagens", aliases: ["imagens", "gerar imagens", "imagem"] },
      { label: "WebCraft", aliases: ["webcraft", "website", "sites"] },
      { label: "Apresentações", aliases: ["apresentações", "apresentacoes", "slides"] },
      { label: "Ebooks", aliases: ["ebooks", "ebook", "livros"] },
    ],
  },
  tools: {
    label: "Ferramentas",
    items: [
      { label: "Analisar", aliases: ["vision", "visão", "visao", "analisar"] },
      { label: "Banco de Imagens", aliases: ["banco de imagens", "image bank"] },
      { label: "Melhorar Imagem", aliases: ["melhorar imagem", "melhorador", "enhancer"] },
      { label: "Clipper", aliases: ["clipper", "clips"] },
    ],
  },
  social: {
    label: "Social",
    items: [
      { label: "Marketing", aliases: ["marketing"] },
      { label: "Mensagens", aliases: ["mensagens", "messaging", "sms", "whatsapp"] },
    ],
  },
  more: {
    label: "Mais",
    items: [
      { label: "Live", aliases: ["live", "modo live"] },
      { label: "Pro", aliases: ["pro"] },
    ],
  },
}

function normalise(value: string) {
  return value
    .toLocaleLowerCase("pt-PT")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function openNativeTool(aliases: string[]) {
  const wanted = aliases.map(normalise)
  const buttons = Array.from(document.querySelectorAll("button"))

  const target = buttons.find((button) => {
    const text = normalise(button.textContent ?? "")
    return wanted.some((alias) => text === alias || text.startsWith(`${alias} `))
  })

  if (target instanceof HTMLButtonElement) {
    target.click()
    return true
  }

  return false
}

export function LuminQuickTabs() {
  const [openGroup, setOpenGroup] = useState<GroupId | null>(null)

  const openChat = () => {
    openNativeTool(["chat", "conversa"])
    setOpenGroup(null)
  }

  const toggleGroup = (group: GroupId) => {
    setOpenGroup((current) => (current === group ? null : group))
  }

  const openItem = (item: ToolLink) => {
    openNativeTool(item.aliases)
    setOpenGroup(null)
  }

  return (
    <div className="fixed left-0 right-0 top-14 z-[44] md:hidden">
      <div className="border-b border-[#d6a84b]/12 bg-[#050504]/94 px-2 py-1.5 backdrop-blur-xl">
        <div className="mx-auto flex max-w-xl items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={openChat}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-[#d6a84b]/14 bg-[#0b0906] px-3 py-1.5 text-[11px] font-medium text-[#f3ead6] active:scale-[.98]"
          >
            <MessageSquare className="h-3.5 w-3.5 text-[#dfb75f]" />
            Chat
          </button>

          <button
            type="button"
            onClick={() => toggleGroup("create")}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/8 bg-black/45 px-3 py-1.5 text-[11px] text-zinc-300 active:scale-[.98]"
          >
            <ImageIcon className="h-3.5 w-3.5 text-[#dfb75f]" />
            Criar
            <ChevronDown className="h-3 w-3" />
          </button>

          <button
            type="button"
            onClick={() => toggleGroup("tools")}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/8 bg-black/45 px-3 py-1.5 text-[11px] text-zinc-300 active:scale-[.98]"
          >
            <Wrench className="h-3.5 w-3.5 text-[#dfb75f]" />
            Ferramentas
            <ChevronDown className="h-3 w-3" />
          </button>

          <button
            type="button"
            onClick={() => toggleGroup("social")}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/8 bg-black/45 px-3 py-1.5 text-[11px] text-zinc-300 active:scale-[.98]"
          >
            <Share2 className="h-3.5 w-3.5 text-[#dfb75f]" />
            Social
            <ChevronDown className="h-3 w-3" />
          </button>

          <button
            type="button"
            onClick={() => toggleGroup("more")}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/8 bg-black/45 px-3 py-1.5 text-[11px] text-zinc-300 active:scale-[.98]"
          >
            <Plus className="h-3.5 w-3.5 text-[#dfb75f]" />
            Mais
          </button>
        </div>
      </div>

      {openGroup && (
        <div className="mx-2 mt-1.5 rounded-2xl border border-[#d6a84b]/16 bg-[#080704]/96 p-2 shadow-[0_18px_45px_rgba(0,0,0,.55)] backdrop-blur-xl">
          <div className="mb-1 px-2 py-1 text-[10px] font-semibold uppercase tracking-[.18em] text-[#b99b60]">
            {GROUPS[openGroup].label}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {GROUPS[openGroup].items.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => openItem(item)}
                className="rounded-xl border border-white/7 bg-black/35 px-3 py-2.5 text-left text-[12px] font-medium text-zinc-200 active:bg-[#d6a84b]/10"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
