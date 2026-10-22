import { Suspense } from "react"
import { RepeticionPantalla } from "@/features/viajes"

export default function Page() {
  return (
    <main className="flex h-dvh flex-col">
      <Suspense fallback={<p className="p-6">Cargando viaje...</p>}><RepeticionPantalla /></Suspense>
    </main>
  )
}
