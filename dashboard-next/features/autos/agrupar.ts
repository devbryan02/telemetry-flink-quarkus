import type { Auto } from "./types"

/** Resumen de un conjunto de autos (una empresa o una flota) para dibujarlo como burbuja. */
export type Grupo = {
  id: string
  nombre: string
  total: number
  encendidos: number
  /** [lon, lat] del centroide */
  centro: [number, number]
  /** [[lonMín, latMín], [lonMáx, latMáx]] */
  limites: [[number, number], [number, number]]
}

export type ResumenFlota = {
  empresas: Grupo[]
  flotasTotal: number
  particulares: number
}

/** `emp-03` → "Empresa 03" (en el MVP los nombres se derivan de los IDs, spec §4). */
export function nombreEmpresa(companyId: string): string {
  return `Empresa ${companyId.replace(/^emp-/, "")}`
}

/** `emp-03-f2` → "Flota 2". */
export function nombreFlota(fleetId: string): string {
  return `Flota ${fleetId.slice(fleetId.lastIndexOf("-f") + 2)}`
}

type Acumulador = {
  total: number
  encendidos: number
  sumaLon: number
  sumaLat: number
  minLon: number
  minLat: number
  maxLon: number
  maxLat: number
}

function acumular(grupos: Map<string, Acumulador>, id: string, auto: Auto) {
  let g = grupos.get(id)
  if (!g) {
    g = { total: 0, encendidos: 0, sumaLon: 0, sumaLat: 0, minLon: 180, minLat: 90, maxLon: -180, maxLat: -90 }
    grupos.set(id, g)
  }
  g.total++
  if (auto.engine === "ON") g.encendidos++
  g.sumaLon += auto.lon
  g.sumaLat += auto.lat
  if (auto.lon < g.minLon) g.minLon = auto.lon
  if (auto.lat < g.minLat) g.minLat = auto.lat
  if (auto.lon > g.maxLon) g.maxLon = auto.lon
  if (auto.lat > g.maxLat) g.maxLat = auto.lat
}

function aGrupos(grupos: Map<string, Acumulador>, nombrar: (id: string) => string): Grupo[] {
  return [...grupos]
    .map(([id, g]) => ({
      id,
      nombre: nombrar(id),
      total: g.total,
      encendidos: g.encendidos,
      centro: [g.sumaLon / g.total, g.sumaLat / g.total] as [number, number],
      limites: [
        [g.minLon, g.minLat],
        [g.maxLon, g.maxLat],
      ] as [[number, number], [number, number]],
    }))
    .sort((a, b) => a.id.localeCompare(b.id, "es", { numeric: true }))
}

/**
 * Una pasada sobre toda la flota: una entrada por empresa, más los conteos de flotas y particulares.
 * La burbuja de cada empresa se ancla en su flota más grande (su base principal): el centroide de
 * todos sus autos cae casi siempre en el centro de Lima, porque sus flotas están repartidas.
 */
export function resumirEmpresas(autos: Iterable<Auto>): ResumenFlota {
  const empresas = new Map<string, Acumulador>()
  const flotas = new Map<string, Acumulador>()
  let particulares = 0
  for (const auto of autos) {
    if (auto.companyId == null) {
      particulares++
      continue
    }
    acumular(empresas, auto.companyId, auto)
    if (auto.fleetId) acumular(flotas, auto.fleetId, auto)
  }
  const basePrincipal = new Map<string, Acumulador>()
  for (const [fleetId, f] of flotas) {
    const companyId = fleetId.slice(0, fleetId.lastIndexOf("-f"))
    const actual = basePrincipal.get(companyId)
    if (!actual || f.total > actual.total) basePrincipal.set(companyId, f)
  }
  const grupos = aGrupos(empresas, nombreEmpresa).map((g) => {
    const base = basePrincipal.get(g.id)
    return base ? { ...g, centro: [base.sumaLon / base.total, base.sumaLat / base.total] as [number, number] } : g
  })
  return { empresas: grupos, flotasTotal: flotas.size, particulares }
}

/** Las flotas de una empresa. */
export function resumirFlotas(autos: Iterable<Auto>, companyId: string): Grupo[] {
  const flotas = new Map<string, Acumulador>()
  for (const auto of autos) {
    if (auto.companyId === companyId && auto.fleetId) acumular(flotas, auto.fleetId, auto)
  }
  return aGrupos(flotas, nombreFlota)
}

/** Burbuja que puede representar uno o varios grupos que se solapan en pantalla. */
export type BurbujaGrupos = {
  grupos: Grupo[]
  total: number
  encendidos: number
  centro: [number, number]
  limites: [[number, number], [number, number]]
}

/**
 * Fusiona los grupos cuyas burbujas quedarían a menos de `distanciaPx` en pantalla. Recorre de mayor a
 * menor, así que cada burbuja fusionada se ancla en su grupo más grande.
 */
export function fusionarSolapadas(
  grupos: Grupo[],
  proyectar: (lonLat: [number, number]) => [number, number],
  distanciaPx: number,
): BurbujaGrupos[] {
  const burbujas: (BurbujaGrupos & { px: [number, number] })[] = []
  for (const g of [...grupos].sort((a, b) => b.total - a.total)) {
    const px = proyectar(g.centro)
    const cercana = burbujas.find((b) => Math.hypot(b.px[0] - px[0], b.px[1] - px[1]) < distanciaPx)
    if (cercana) {
      cercana.grupos.push(g)
      cercana.total += g.total
      cercana.encendidos += g.encendidos
      cercana.limites = [
        [Math.min(cercana.limites[0][0], g.limites[0][0]), Math.min(cercana.limites[0][1], g.limites[0][1])],
        [Math.max(cercana.limites[1][0], g.limites[1][0]), Math.max(cercana.limites[1][1], g.limites[1][1])],
      ]
    } else {
      burbujas.push({ grupos: [g], total: g.total, encendidos: g.encendidos, centro: g.centro, limites: g.limites, px })
    }
  }
  return burbujas.map((b) => ({ grupos: b.grupos, total: b.total, encendidos: b.encendidos, centro: b.centro, limites: b.limites }))
}
