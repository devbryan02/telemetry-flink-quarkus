import { metros } from "./distancia"
import type { PosicionVista } from "./types"

export type Muestra = { ts: number; lat: number; lon: number; heading: number; battery: number }
export type Recorrido = { muestras: Muestra[]; acumuladoM: number[] }
export type Hueco = { desde: number; hasta: number; ms: number }
export type Instante = { lat: number; lon: number; heading: number; battery: number; distanciaM: number; kmh: number; indice: number }

/** Muestras en orden de tiempo (una por ts) con los metros acumulados hasta cada una. */
export function prepararRecorrido(posiciones: PosicionVista[]): Recorrido {
  const vistos = new Set<number>()
  const muestras: Muestra[] = []
  // sort es estable: con ts repetido queda la primera que llegó (una reentrega no es un movimiento)
  for (const p of [...posiciones].sort((a, b) => a.ts - b.ts)) {
    if (vistos.has(p.ts)) continue
    vistos.add(p.ts)
    muestras.push({ ts: p.ts, lat: p.lat, lon: p.lon, heading: p.heading, battery: p.battery })
  }
  const acumuladoM = muestras.map(() => 0)
  for (let i = 1; i < muestras.length; i++) acumuladoM[i] = acumuladoM[i - 1] + metros(muestras[i - 1], muestras[i])
  return { muestras, acumuladoM }
}

/** km/h del tramo [i, i+1]; los ts son únicos, pero dt <= 0 da 0 por seguridad. */
function kmhTramo(r: Recorrido, i: number): number {
  const dt = r.muestras[i + 1].ts - r.muestras[i].ts
  return dt > 0 ? ((r.acumuladoM[i + 1] - r.acumuladoM[i]) / dt) * 3_600 : 0
}

/** Velocidad de cada tramo, fechada al final del tramo. */
export function velocidades(r: Recorrido): { ts: number; kmh: number }[] {
  return r.muestras.slice(1).map((m, i) => ({ ts: m.ts, kmh: kmhTramo(r, i) }))
}

export function huecos(r: Recorrido, umbralMs: number): Hueco[] {
  const lista: Hueco[] = []
  for (let i = 1; i < r.muestras.length; i++) {
    const ms = r.muestras[i].ts - r.muestras[i - 1].ts
    if (ms > umbralMs) lista.push({ desde: r.muestras[i - 1].ts, hasta: r.muestras[i].ts, ms })
  }
  return lista
}

function instante(m: Muestra, distanciaM: number, kmh: number, indice: number): Instante {
  return { lat: m.lat, lon: m.lon, heading: m.heading, battery: m.battery, distanciaM, kmh, indice }
}

/** Estado interpolado en `ts`; en los extremos se queda en la primera o la última muestra. */
export function estadoEn(r: Recorrido, ts: number): Instante | null {
  const { muestras: m, acumuladoM: d } = r
  if (m.length === 0) return null
  const ultimo = m.length - 1
  if (m.length === 1 || ts <= m[0].ts) return instante(m[0], 0, m.length > 1 ? kmhTramo(r, 0) : 0, 0)
  if (ts >= m[ultimo].ts) return instante(m[ultimo], d[ultimo], kmhTramo(r, ultimo - 1), ultimo)
  // búsqueda binaria del tramo [lo, hi] que contiene ts
  let lo = 0
  let hi = ultimo
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (m[mid].ts <= ts) lo = mid
    else hi = mid
  }
  const a = m[lo]
  const b = m[hi]
  const f = (ts - a.ts) / (b.ts - a.ts)
  const mezcla = (x: number, y: number) => x + (y - x) * f
  return {
    lat: mezcla(a.lat, b.lat),
    lon: mezcla(a.lon, b.lon),
    heading: b.heading,
    battery: mezcla(a.battery, b.battery),
    distanciaM: mezcla(d[lo], d[hi]),
    kmh: kmhTramo(r, lo),
    indice: lo,
  }
}
