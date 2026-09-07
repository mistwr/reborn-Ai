"use client"

import type React from "react"

import { SessionProvider } from "next-auth/react"
import { ProSessionAuthority } from "@/components/pro-session-authority"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ProSessionAuthority />
      {children}
    </SessionProvider>
  )
}
