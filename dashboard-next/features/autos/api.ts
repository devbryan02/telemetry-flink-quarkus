import type { FeatureCollection, LineString } from "geojson"

import { http } from "@/lib/http"

import type { Auto, EstadoSimulacion, ResumenRuta } from "./types"

/** Última posición de cada auto (`GET /autos`). */
export async function obtenerAutos(signal?: AbortSignal): Promise<Auto[]> {
  const { data } = await http.get<Auto[]>("/autos", { signal })
  return data
}

/** Rutas establecidas (`GET /rutas`). */
export async function listarRutas(signal?: AbortSignal): Promise<ResumenRuta[]> {
  const { data } = await http.get<ResumenRuta[]>("/rutas", { signal })
  return data
}

/** Geometría de una ruta, de la salida a la meta (`GET /rutas/{id}`). */
export async function obtenerRuta(id: string, signal?: AbortSignal): Promise<FeatureCollection<LineString>> {
  const { data } = await http.get<FeatureCollection<LineString>>(`/rutas/${encodeURIComponent(id)}`, { signal })
  return data
}

export async function obtenerSimulacion(): Promise<EstadoSimulacion> {
  const { data } = await http.get<EstadoSimulacion>("/simulacion")
  return data
}

/** Nueva carrera en la ruta indicada: todos salen juntos del inicio. */
export async function iniciarCarrera(ruta: string): Promise<EstadoSimulacion> {
  const { data } = await http.post<EstadoSimulacion>("/simulacion/iniciar", { ruta })
  return data
}

export async function detenerCarrera(): Promise<EstadoSimulacion> {
  const { data } = await http.post<EstadoSimulacion>("/simulacion/detener")
  return data
}

/** Cambia la velocidad de un auto (10–500 km/h), también en plena carrera. */
export async function cambiarVelocidad(carId: string, kmh: number): Promise<EstadoSimulacion> {
  const { data } = await http.put<EstadoSimulacion>(`/simulacion/autos/${encodeURIComponent(carId)}/velocidad`, { kmh })
  return data
}
