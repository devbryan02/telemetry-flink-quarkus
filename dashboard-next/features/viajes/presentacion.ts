import type { Carrera, EstadoCarrera, Participante } from "./carreras"

const km2 = new Intl.NumberFormat("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** Día local completo de la fecha dada, en epoch ms (los filtros `desde`/`hasta` de GET /viajes). */
export function rangoDelDia(d: Date): { desde: number; hasta: number } {
  const desde = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const hasta = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime() - 1
  return { desde, hasta }
}

export function filtrarCarreras(cs: Carrera[], f: { estado: EstadoCarrera | null; ruta: string | null }): Carrera[] {
  return cs.filter((c) => (!f.estado || c.estado === f.estado) && (!f.ruta || c.rutaId === f.ruta))
}

export function conteoPorEstado(cs: Carrera[]): Record<EstadoCarrera, number> {
  const conteo: Record<EstadoCarrera, number> = { EN_CURSO: 0, TERMINADA: 0, DETENIDA: 0 }
  for (const c of cs) conteo[c.estado]++
  return conteo
}

/** 234000 → "3:54"; con horas → "4:05:07". Se redondea al segundo. */
export function duracion(ms: number): string {
  const t = Math.round(ms / 1000)
  const h = Math.floor(t / 3600)
  const m = Math.floor((t % 3600) / 60)
  const s = String(t % 60).padStart(2, "0")
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`
}

/** Lo que muestra la fila: tiempo y diferencia si llegó; si no, distancia y metros detrás. */
export function textoResultado(p: Participante): { valor: string; diferencia: string } {
  if (p.estado === "FINALIZADO") {
    return {
      valor: p.duracionMs === null ? "—" : duracion(p.duracionMs),
      diferencia: !p.diferenciaMs ? "—" : `+${duracion(p.diferenciaMs)}`,
    }
  }
  return {
    valor: p.distanciaM === null ? "—" : `${km2.format(p.distanciaM / 1000)} km`,
    diferencia: p.diferenciaM === null ? "—" : p.diferenciaM === 0 ? "adelante" : `−${km2.format(-p.diferenciaM / 1000)} km`,
  }
}

/** Path SVG de una LineString [lon, lat] dentro de `ancho`×`alto`, con margen y el norte arriba. */
export function trazoSvg(coords: [number, number][], ancho: number, alto: number, margen: number): string {
  if (coords.length < 2) return ""
  const xs = coords.map((c) => c[0])
  const ys = coords.map((c) => c[1])
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
  // misma escala en ambos ejes para no deformar la ruta; un tramo sin extensión usa escala 1
  const escala = Math.min((ancho - 2 * margen) / (x1 - x0 || 1), (alto - 2 * margen) / (y1 - y0 || 1))
  const px = (x: number) => Math.round(margen + (x - x0) * escala)
  const py = (y: number) => Math.round(alto - margen - (y - y0) * escala)
  return coords.map((c, i) => `${i === 0 ? "M" : "L"}${px(c[0])} ${py(c[1])}`).join(" ")
}

/** Path SVG de la velocidad en el tiempo: x = ts dentro de [inicio, fin], y = km/h (0 abajo, maxKmh arriba). */
export function trazoVelocidad(
  puntos: { ts: number; kmh: number }[],
  inicio: number,
  fin: number,
  ancho: number,
  alto: number,
  maxKmh: number,
): string {
  if (puntos.length === 0 || fin <= inicio || maxKmh <= 0) return ""
  const x = (ts: number) => Math.round(((ts - inicio) / (fin - inicio)) * ancho)
  const y = (kmh: number) => Math.round(alto - (Math.min(kmh, maxKmh) / maxKmh) * alto)
  return puntos.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.ts)} ${y(p.kmh)}`).join(" ")
}
