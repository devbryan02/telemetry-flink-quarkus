export type MuestraProm = { nombre: string; etiquetas: Record<string, string>; valor: number }

const LINEA = /^([a-zA-Z_:][a-zA-Z0-9_:]*)(?:\{(.*)\})?\s+(\S+)/
const ETIQUETA = /([a-zA-Z_][a-zA-Z0-9_]*)="((?:[^"\\]|\\.)*)"/g

/** Formato de texto de Prometheus: se ignoran comentarios y líneas vacías. */
export function parsearPrometheus(texto: string): MuestraProm[] {
  const muestras: MuestraProm[] = []
  for (const linea of texto.split("\n")) {
    if (!linea || linea.startsWith("#")) continue
    const m = LINEA.exec(linea)
    if (!m) continue
    const etiquetas: Record<string, string> = {}
    for (const [, k, v] of (m[2] ?? "").matchAll(ETIQUETA)) etiquetas[k] = v
    muestras.push({ nombre: m[1], etiquetas, valor: Number(m[3]) })
  }
  return muestras
}

/** Primer valor de la métrica que tenga esas etiquetas; null si no está o es NaN. */
export function valor(ms: MuestraProm[], nombre: string, etiquetas: Record<string, string> = {}): number | null {
  const m = ms.find((x) => x.nombre === nombre && Object.entries(etiquetas).every(([k, v]) => x.etiquetas[k] === v))
  return m && Number.isFinite(m.valor) ? m.valor : null
}

/** Eventos por segundo entre dos lecturas de un contador; null si no se puede calcular o el contador se reinició. */
export function tasaPorSegundo(anterior: number | null, actual: number | null, dtMs: number): number | null {
  if (anterior === null || actual === null || dtMs <= 0 || actual < anterior) return null
  return ((actual - anterior) / dtMs) * 1_000
}

/** Mayor valor finito de todas las series coincidentes (lag por particion). */
export function valorMaximo(ms: MuestraProm[], nombre: string, etiquetas: Record<string, string> = {}): number | null {
  const valores = ms.filter((m) => m.nombre === nombre && Number.isFinite(m.valor) && Object.entries(etiquetas).every(([k, v]) => m.etiquetas[k] === v)).map((m) => m.valor)
  return valores.length ? Math.max(...valores) : null
}
