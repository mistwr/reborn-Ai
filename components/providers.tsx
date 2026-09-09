"use client"

import type React from "react"

import { SessionProvider } from "next-auth/react"
import { ProSessionAuthority } from "@/components/pro-session-authority"
import { ProjectContextBridge } from "@/components/project-context-bridge"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ProSessionAuthority />
      <ProjectContextBridge />
      {children}
    </SessionProvider>
  )
}
