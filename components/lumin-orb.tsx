"use client"

import { Sparkles } from "lucide-react"

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
        <div className="absolute inset-[2%] rounded-full border border-[#e8bd61]/18 animate-[spin_18s_linear_infinite]" />
        <div className="absolute inset-[9%] rounded-full border border-[#8d6b35]/12 animate-[spin_26s_linear_infinite_reverse]" />
        <div
          className="absolute inset-[15%] rounded-full border border-[#e8bd61]/18"
          style={{
            animation: `luminPulse ${pulseMs}ms ease-in-out infinite`,
            boxShadow: `0 0 ${24 + activity * 46}px rgba(232,189,97,${.13 + activity * .36})`,
          }}
        />

        <div
          className="relative flex items-center justify-center rounded-full border border-white/10 transition-transform duration-100"
          style={{
            width: size * .62,
            height: size * .62,
            transform: `scale(${1 + activity * .1})`,
            background:
              "radial-gradient(circle at 34% 23%,rgba(255,255,255,.17),transparent 16%),radial-gradient(circle at 66% 72%,rgba(229,177,68,.16),transparent 28%),radial-gradient(circle at 48% 50%,rgba(10,10,12,.38),rgba(0,0,0,.94) 72%)",
            boxShadow: `inset 0 0 64px rgba(255,255,255,.035), inset 0 -18px 50px rgba(213,160,63,.07), 0 0 ${28 + activity * 42}px rgba(218,171,76,${.12 + activity * .32})`,
            backdropFilter: "blur(10px)",
          }}
        >
          <div className="absolute inset-[6%] rounded-full border border-[#f3cf78]/10" />
          <div className="absolute left-[18%] top-[13%] h-[16%] w-[27%] rounded-full bg-white/8 blur-md" />
          <div className="absolute inset-[20%] rounded-full bg-[radial-gradient(circle,rgba(232,189,97,.08),transparent_68%)]" />

          <div className="relative flex h-[34%] w-[34%] items-center justify-center rounded-full border border-[#f5d37d]/28 bg-black/45 shadow-[0_0_32px_rgba(244,196,91,.24),inset_0_0_22px_rgba(232,189,97,.08)] backdrop-blur-md">
            <span className="bg-gradient-to-br from-[#fff1bc] via-[#e3b455] to-[#8d5b17] bg-clip-text text-[clamp(1.5rem,3.5vw,2.5rem)] font-semibold leading-none text-transparent">
              L
            </span>
            <Sparkles className="absolute -right-2 -top-2 h-5 w-5 text-[#f5cf70] drop-shadow-[0_0_10px_rgba(245,207,112,.55)]" />
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
