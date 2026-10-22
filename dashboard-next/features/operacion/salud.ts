export type Check = { name: string; status: "UP" | "DOWN"; data?: Record<string, unknown> }
export type Salud = { status: "UP" | "DOWN"; checks: Check[]; error: string | null }
export type FilaSalud = { nombre: string; ok: boolean; detalle: string }

function esSalud(x: unknown): x is { status: "UP" | "DOWN"; checks: Check[] } {
  const o = x as { status?: unknown; checks?: unknown } | null
  return !!o && (o.status === "UP" || o.status === "DOWN") && Array.isArray(o.checks)
}

/** SmallRye Health responde 200 (UP) o 503 (DOWN) con el mismo cuerpo; cualquier otra cosa es un error. */
export function interpretarSalud(httpStatus: number, cuerpo: unknown): Salud {
  if (esSalud(cuerpo)) return { status: cuerpo.status, checks: cuerpo.checks, error: null }
  return { status: "DOWN", checks: [], error: `Respuesta inesperada (HTTP ${httpStatus})` }
}

/** Una fila por check; el de mensajería se abre en una fila por canal. */
export function filasSalud(s: Salud): FilaSalud[] {
  return s.checks.flatMap((c): FilaSalud[] => {
    if (c.name.includes("Messaging") && c.data) {
      return Object.entries(c.data).map(([canal, d]) => ({ nombre: `Canal ${canal}`, ok: String(d).startsWith("[OK]"), detalle: String(d) }))
    }
    const nombre = c.name.startsWith("Database") ? "Base de datos" : c.name
    return [{ nombre, ok: c.status === "UP", detalle: c.status }]
  })
}
