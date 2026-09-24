"use client"

import { AuthModal } from "@/components/auth-modal"

export default function LoginPage() {
  return (
    <main className="min-h-[100dvh] bg-black">
      <AuthModal
        isOpen
        onClose={() => {
          window.location.assign("/")
        }}
      />
    </main>
  )
}
