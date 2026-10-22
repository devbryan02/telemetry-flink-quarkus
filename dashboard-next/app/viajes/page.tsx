import { ViajesPantalla } from "@/features/viajes"
import { Suspense } from "react"

export default function Page() {
  return (
    <main className="flex h-dvh flex-col">
      <Suspense fallback={<p className="p-6">Cargando viajes…</p>}>
        <ViajesPantalla />
      </Suspense>
    </main>
  )
}
