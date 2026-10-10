import type { Auto } from "./types"

const VENTANA_LOTES_MS = 5_000

/** Métricas del flujo en tiempo real (spec §10 RF-U6 y §11), calculadas fuera de React. */
export class Metricas {
  private llegadas: number[] = []
  private edades: number[] = []
  private ultimoTs = 0

  /** Registra un lote recibido por el WebSocket. */
  registrarLote(lote: Auto[], ahora = Date.now()): void {
    this.llegadas.push(ahora)
    this.edades = lote.map((a) => ahora - a.ts)
    for (const a of lote) if (a.ts > this.ultimoTs) this.ultimoTs = a.ts
  }

  /** Lotes por segundo en los últimos 5 s. */
  lotesPorSegundo(ahora = Date.now()): number {
    this.llegadas = this.llegadas.filter((t) => ahora - t <= VENTANA_LOTES_MS)
    return this.llegadas.length / (VENTANA_LOTES_MS / 1000)
  }

  /** Antigüedad del dato más reciente recibido, o null si aún no llegó ninguno. */
  edadUltimoDato(ahora = Date.now()): number | null {
    return this.ultimoTs ? ahora - this.ultimoTs : null
  }

  /** Percentil 95 de `Date.now() - ts` en el último lote (latencia extremo a extremo). */
  latenciaP95(): number | null {
    if (this.edades.length === 0) return null
    const ordenadas = [...this.edades].sort((a, b) => a - b)
    return ordenadas[Math.min(ordenadas.length - 1, Math.floor(ordenadas.length * 0.95))]
  }
}
