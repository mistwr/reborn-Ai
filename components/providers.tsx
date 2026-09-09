"use client"

import type React from "react"

import { SessionProvider } from "next-auth/react"
import { ProSessionAuthority } from "@/components/pro-session-authority"
import { ProjectContextBridge } from "@/components/project-context-bridge"
import { ProjectContextPanel } from "@/components/project-context-panel"
import { LiveVisionBridge } from "@/components/live-vision-bridge"
import { RebornLiveAvatar } from "@/components/reborn-live-avatar"
import { NeuralVoiceBridge } from "@/components/neural-voice-bridge"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ProSessionAuthority />
      <ProjectContextBridge />
      <ProjectContextPanel />
      <LiveVisionBridge />
      <RebornLiveAvatar />
      <NeuralVoiceBridge />
      {children}
    </SessionProvider>
  )
}
