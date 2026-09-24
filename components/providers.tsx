"use client"

import type React from "react"

import { SessionProvider } from "next-auth/react"
import { ProSessionAuthority } from "@/components/pro-session-authority"
import { ProjectContextBridge } from "@/components/project-context-bridge"
import { ProjectContextPanel } from "@/components/project-context-panel"
import { LiveVisionBridge } from "@/components/live-vision-bridge"
import { RebornLiveAvatar } from "@/components/reborn-live-avatar"
import { NeuralVoiceBridge } from "@/components/neural-voice-bridge"
import { LiveInterruptControl } from "@/components/live-interrupt-control"
import { LuminResilienceRetry } from "@/components/lumin-resilience-retry"
import { LuminDesktopPointerGuard } from "@/components/lumin-shell/desktop-pointer-guard"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ProSessionAuthority />
      <ProjectContextBridge />
      <LuminResilienceRetry />
      <LuminDesktopPointerGuard />
      <ProjectContextPanel />
      <LiveVisionBridge />
      <RebornLiveAvatar />
      <NeuralVoiceBridge />
      <LiveInterruptControl />
      {children}
    </SessionProvider>
  )
}
