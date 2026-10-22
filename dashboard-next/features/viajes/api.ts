import { http } from "@/lib/http"

import type { GeometriaRuta, ResumenRuta, Pagina, PosicionVista, ResumenViaje, ViajeDetalle, ViajeVista } from "./types"

/** Límite por página que pide la pantalla; la API acepta de 1 a 1000 (ConsultaPagina). */
const LIMITE_VIAJES = 100
const LIMITE_POSICIONES = 1_000
/** Corte de seguridad: 50 páginas de 1000 = 13,9 h de muestras a 1 por segundo. */
const MAX_PAGINAS_POSICIONES = 50
const LOTE_RESUMENES = 6

export async function listarViajes(
  filtro: { desde?: number; hasta?: number; cursor?: string },
  signal?: AbortSignal,
): Promise<Pagina<ViajeVista>> {
  const { data } = await http.get<Pagina<ViajeVista>>("/viajes", { params: { ...filtro, limit: LIMITE_VIAJES }, signal })
  return data
}

export async function obtenerViaje(viajeId: string, signal?: AbortSignal): Promise<ViajeDetalle> {
  const { data } = await http.get<ViajeDetalle>(`/viajes/${encodeURIComponent(viajeId)}`, { signal })
  return data
}

/** Resumen de cada viaje, de 6 en 6 para no saturar la API. */
export async function obtenerResumenes(ids: string[], signal?: AbortSignal): Promise<Map<string, ResumenViaje>> {
  const resumenes = new Map<string, ResumenViaje>()
  for (let i = 0; i < ids.length; i += LOTE_RESUMENES) {
    const lote = await Promise.all(ids.slice(i, i + LOTE_RESUMENES).map((id) => obtenerViaje(id, signal)))
    for (const d of lote) resumenes.set(d.viaje.viajeId, d.resumen)
  }
  return resumenes
}

/** Todas las muestras del viaje en orden de la API, recorriendo el cursor. */
export async function listarPosiciones(viajeId: string, signal?: AbortSignal): Promise<PosicionVista[]> {
  const todas: PosicionVista[] = []
  let cursor: string | undefined
  for (let pagina = 0; pagina < MAX_PAGINAS_POSICIONES; pagina++) {
    const { data } = await http.get<Pagina<PosicionVista>>(`/viajes/${encodeURIComponent(viajeId)}/posiciones`, {
      params: { limit: LIMITE_POSICIONES, cursor },
      signal,
    })
    todas.push(...data.items)
    if (!data.nextCursor) break
    cursor = data.nextCursor
  }
  return todas
}

export async function listarRutas(signal?: AbortSignal): Promise<ResumenRuta[]> {
  const { data } = await http.get<ResumenRuta[]>("/rutas", { signal })
  return data
}

export async function obtenerGeometria(id: string, signal?: AbortSignal): Promise<GeometriaRuta> {
  const { data } = await http.get<GeometriaRuta>(`/rutas/${encodeURIComponent(id)}`, { signal })
  return data
}
