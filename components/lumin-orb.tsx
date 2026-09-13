"use client"

import { Bot, Sparkles } from "lucide-react"

export type LuminOrbState = "idle" | "listening" | "thinking" | "speaking"

export function LuminOrb({
  state = "idle",
  level = 0,
  size = 260,
  showLabel = false,
}: {
  state?: LuminOrbState
  level?: number
  size?: number
  showLabel?: boolean
}) {
  const liveLevel = Math.max(0, Math.min(1, level))
  const activity = state === "speaking" ? Math.max(.24, liveLevel) : state === "listening" ? .28 : state === "thinking" ? .18 : .08
  const pulseMs = state === "speaking" ? 520 : state === "listening" ? 850 : state === "thinking" ? 1100 : 2400
  const label = state === "speaking" ? "A falar" : state === "listening" ? "A ouvir" : state === "thinking" ? "A pensar" : "Pronto"

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <div className="absolute inset-[2%] rounded-full border border-[#e8bd61]/20 animate-[spin_16s_linear_infinite]" />
        <div className="absolute inset-[9%] rounded-full border border-violet-400/10 animate-[spin_23s_linear_infinite_reverse]" />
        <div
          className="absolute inset-[15%] rounded-full border border-[#e8bd61]/20"
          style={{
            animation: `luminPulse ${pulseMs}ms ease-in-out infinite`,
            boxShadow: `0 0 ${24 + activity * 46}px rgba(232,189,97,${.16 + activity * .42})`,
          }}
        />
        <div
          className="relative flex items-center justify-center rounded-full border border-white/15 transition-transform duration-100"
          style={{
            width: size * .62,
            height: size * .62,
            transform: `scale(${1 + activity * .1})`,
            background: "radial-gradient(circle at 34% 23%,rgba(255,255,255,.23),transparent 16%),radial-gradient(circle at 67% 70%,rgba(229,177,68,.22),transparent 25%),radial-gradient(circle at 48% 50%,rgba(24,20,32,.6),rgba(1,1,2,.97) 68%)",
            boxShadow: `inset 0 0 55px rgba(255,255,255,.05),0 0 ${28 + activity * 42}px rgba(218,171,76,${.14 + activity * .38})`,
          }}
        >
          <div className="absolute inset-[6%] rounded-full border border-[#f3cf78]/10" />
          <div className="absolute left-[18%] top-[13%] h-[16%] w-[27%] rounded-full bg-white/10 blur-md" />
          <div className="relative flex h-[31%] w-[31%] items-center justify-center rounded-[28%] border border-[#f5d37d]/20 bg-gradient-to-br from-[#f7d981] via-[#b87922] to-[#ffe9a8] shadow-[0_0_30px_rgba(244,196,91,.34)]">
            <Bot className="h-[55%] w-[55%] text-black/80" strokeWidth={1.8} />
            <Sparkles className="absolute -right-2 -top-2 h-5 w-5 text-[#f5cf70]" />
          </div>
        </div>
        {state === "speaking" && (
          <div className="absolute bottom-[4%] flex h-9 items-center gap-1">
            {[.55,.9,.68,1,.72,.92,.58].map((m, i) => (
              <span
                key={i}
                className="w-1.5 rounded-full bg-gradient-to-t from-[#8f5d1b] to-[#f5d47f]"
                style={{ height: `${10 + (18 * m * Math.max(.4, liveLevel))}px`, animation: `luminBar ${360 + i * 55}ms ease-in-out infinite alternate` }}
              />
            ))}
          </div>
        )}
      </div>
      {showLabel && <div className="mt-2 text-sm font-medium text-[#e8bd61]">{label}</div>}
      <style jsx>{`
        @keyframes luminPulse { 0%,100%{transform:scale(.96);opacity:.55} 50%{transform:scale(1.06);opacity:1} }
        @keyframes luminBar { from{transform:scaleY(.45);opacity:.55} to{transform:scaleY(1.25);opacity:1} }
      `}</style>
    </div>
  )
}
