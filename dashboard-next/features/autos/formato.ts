export const km = new Intl.NumberFormat("es-PE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })

/** 812 → "0.8 s"; null → "—" */
export function segundos(ms: number | null): string {
  return ms === null ? "—" : `${km.format(ms / 1000)} s`
}

/** 37612 → "0:37,6"; 3723400 → "1:02:03,4" */
export function cronometro(ms: number): string {
  const total = ms / 1000
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = (total % 60).toFixed(1).replace(".", ",").padStart(4, "0")
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`
}

/** Tiempo transcurrido desde `inicio` (ISO-8601 del backend), o null si la carrera no empezó. */
export function tiempoCarrera(inicioIso: string | null, ahoraMs: number): number | null {
  if (!inicioIso) return null
  return Math.max(0, ahoraMs - Date.parse(inicioIso))
}
