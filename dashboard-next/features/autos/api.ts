import type { FeatureCollection, LineString } from "geojson"

import { http } from "@/lib/http"

import type { Auto, EstadoSimulacion } from "./types"

/** Estado completo de la flota (`GET /autos`). */
export async function obtenerAutos(signal?: AbortSignal): Promise<Auto[]> {
  const { data } = await http.get<Auto[]>("/autos", { signal })
  return data
}

/** Geometría de una ruta simulada, con sus calzadas de ida y vuelta (`GET /rutas/{nombre}`). */
export async function obtenerRuta(nombre: string, signal?: AbortSignal): Promise<FeatureCollection<LineString>> {
  const { data } = await http.get<FeatureCollection<LineString>>(`/rutas/${encodeURIComponent(nombre)}`, { signal })
  return data
}

export async function obtenerSimulacion(): Promise<EstadoSimulacion> {
  const { data } = await http.get<EstadoSimulacion>("/simulacion")
  return data
}

export async function iniciarSimulacion(): Promise<EstadoSimulacion> {
  const { data } = await http.post<EstadoSimulacion>("/simulacion/iniciar")
  return data
}

export async function detenerSimulacion(): Promise<EstadoSimulacion> {
  const { data } = await http.post<EstadoSimulacion>("/simulacion/detener")
  return data
}
