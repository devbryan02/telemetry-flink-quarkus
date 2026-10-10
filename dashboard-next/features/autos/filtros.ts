import type { FilterSpecification } from "maplibre-gl"

import type { Auto } from "./types"

/** Empresa o flota presente en los datos, con cuántos autos tiene. */
export type Opcion = { id: string; nombre: string; autos: number }

/** Selección del usuario: `null` = todas. La flota solo aplica con una empresa elegida. */
export type Filtro = { empresa: string | null; flota: string | null }

export const SIN_FILTRO: Filtro = { empresa: null, flota: null }

/** `emp-03` → "Empresa 03" (en el MVP los nombres se derivan de los IDs, spec §4). */
export function nombreEmpresa(companyId: string): string {
  return `Empresa ${companyId.replace(/^emp-/, "")}`
}

/** `emp-03-f2` → "Flota 2". */
export function nombreFlota(fleetId: string): string {
  return `Flota ${fleetId.slice(fleetId.lastIndexOf("-f") + 2)}`
}

function opciones(conteo: Map<string, number>, nombrar: (id: string) => string): Opcion[] {
  return [...conteo]
    .map(([id, autos]) => ({ id, nombre: nombrar(id), autos }))
    .sort((a, b) => a.id.localeCompare(b.id, "es", { numeric: true }))
}

export function empresasDisponibles(autos: Iterable<Auto>): Opcion[] {
  const conteo = new Map<string, number>()
  for (const a of autos) if (a.companyId) conteo.set(a.companyId, (conteo.get(a.companyId) ?? 0) + 1)
  return opciones(conteo, nombreEmpresa)
}

export function flotasDisponibles(autos: Iterable<Auto>, companyId: string): Opcion[] {
  const conteo = new Map<string, number>()
  for (const a of autos) {
    if (a.companyId === companyId && a.fleetId) conteo.set(a.fleetId, (conteo.get(a.fleetId) ?? 0) + 1)
  }
  return opciones(conteo, nombreFlota)
}

export function cumpleFiltro(auto: Auto, filtro: Filtro): boolean {
  if (filtro.flota) return auto.fleetId === filtro.flota
  if (filtro.empresa) return auto.companyId === filtro.empresa
  return true
}

/** El mismo filtro como expresión de MapLibre, para la capa de autos. */
export function expresionFiltro(filtro: Filtro): FilterSpecification {
  if (filtro.flota) return ["==", ["get", "fleetId"], filtro.flota]
  if (filtro.empresa) return ["==", ["get", "companyId"], filtro.empresa]
  return ["boolean", true]
}
