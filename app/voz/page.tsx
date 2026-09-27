export const metadata = {
  title: "LUMIN Voz | LUMIN AI",
  description: "Testa o LUMIN por voz diretamente no browser.",
}

export default function VoiceBrowserPage() {
  return (
    <main className="h-[100dvh] w-full overflow-hidden bg-black">
      <iframe
        title="LUMIN Voz"
        src="/voice-studio/browser/index.html"
        className="h-full w-full border-0"
        allow="microphone; autoplay"
      />
    </main>
  )
}
