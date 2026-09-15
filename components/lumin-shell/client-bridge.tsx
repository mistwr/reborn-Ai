"use client"

import { useEffect, useState } from "react"
import { LuminShellChromeBridge } from "@/components/lumin-shell/chrome-bridge"
import { LuminShellFunctionalBridge } from "@/components/lumin-shell/functional-bridge"

export function LuminShellClientBridge() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <>
      <LuminShellChromeBridge />
      <LuminShellFunctionalBridge />
    </>
  )
}
