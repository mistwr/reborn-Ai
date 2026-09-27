export const metadata = {
  title: "Agentes de Voz | LUMIN AI",
  description: "Cria, testa e usa agentes de voz LUMIN AI para chamadas telefónicas.",
}

export default function VoiceAgentsPage() {
  return (
    <main className="h-[100dvh] w-full overflow-hidden bg-black">
      <iframe
        title="LUMIN Voice Studio"
        src="/voice-studio/agentes/index.html"
        className="h-full w-full border-0"
        allow="microphone; autoplay"
      />
    </main>
  )
}
