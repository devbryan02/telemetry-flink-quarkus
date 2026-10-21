"use client"

import type { FeatureCollection, LineString } from "geojson"
import type { GeoJSONSource } from "maplibre-gl"
import { useEffect, useRef } from "react"

import { useMap } from "@/components/ui/map"

import { type Coordenada, dividirRuta } from "../ruta-progreso"
import { leerToken } from "../tokens"
import { CAPA_AUTOS } from "./autos-layer"

const FUENTE = "ruta"
const FUENTE_TRAMOS = "ruta-tramos"
const CAPA_BORDE = "ruta-borde"
const CAPA_PENDIENTE = "ruta-pendiente"
const CAPA_RECORRIDO = "ruta-recorrido"

const VACIO: FeatureCollection<LineString> = { type: "FeatureCollection", features: [] }

/** Ancho de la línea por zoom; el borde es el doble para que se lea sobre cualquier calle. */
const ancho = (z11: number, z15: number, z18: number) =>
  ["interpolate", ["linear"], ["zoom"], 11, z11, 15, z15, 18, z18] as unknown as number

/** Tramo recorrido por el líder y tramo pendiente, como dos features de una misma fuente. */
function tramos(ruta: FeatureCollection<LineString> | null, progreso: number): FeatureCollection<LineString> {
  const linea = ruta?.features[0]?.geometry.coordinates as Coordenada[] | undefined
  if (!linea || linea.length < 2) return VACIO
  const { recorrido, pendiente } = dividirRuta(linea, progreso)
  return {
    type: "FeatureCollection",
    features: [
      { type: "Feature", properties: { tramo: "pendiente" }, geometry: { type: "LineString", coordinates: pendiente } },
      { type: "Feature", properties: { tramo: "recorrido" }, geometry: { type: "LineString", coordinates: recorrido } },
    ],
  }
}

/**
 * Dibuja la ruta debajo de los autos: un borde (casing) y encima el tramo pendiente y el recorrido por
 * el líder. Los colores salen de los tokens del tema al crear las capas; un cambio de tema recarga el
 * estilo y este efecto vuelve a crearlas con los colores nuevos.
 */
export function RutaLayer({ ruta, progreso }: { ruta: FeatureCollection<LineString> | null; progreso: number }) {
  const { map, isLoaded } = useMap()
  // último avance conocido: al recrear las capas (cambio de tema) se pintan ya con él
  const progresoActual = useRef(progreso)

  useEffect(() => {
    if (!map || !isLoaded || !ruta) return
    if (map.getSource(FUENTE)) {
      ;(map.getSource(FUENTE) as GeoJSONSource).setData(ruta)
      return
    }
    // debajo de los autos si su capa ya existe
    const antes = map.getLayer(CAPA_AUTOS) ? CAPA_AUTOS : undefined
    map.addSource(FUENTE, { type: "geojson", data: ruta })
    map.addSource(FUENTE_TRAMOS, { type: "geojson", data: tramos(ruta, progresoActual.current) })
    const linea = { "line-cap": "round", "line-join": "round" } as const
    map.addLayer(
      {
        id: CAPA_BORDE,
        type: "line",
        source: FUENTE,
        layout: linea,
        paint: { "line-color": leerToken("--ruta-borde", "#ffffff"), "line-width": ancho(6, 12, 18) },
      },
      antes,
    )
    for (const [id, tramo, token, porDefecto] of [
      [CAPA_PENDIENTE, "pendiente", "--ruta-pendiente", "#a6c8ff"],
      [CAPA_RECORRIDO, "recorrido", "--ruta-recorrido", "#0f62fe"],
    ] as const) {
      map.addLayer(
        {
          id,
          type: "line",
          source: FUENTE_TRAMOS,
          filter: ["==", ["get", "tramo"], tramo],
          layout: linea,
          paint: { "line-color": leerToken(token, porDefecto), "line-width": ancho(3, 6, 10) },
        },
        antes,
      )
    }
    return () => {
      if (!map.getStyle()) return
      for (const id of [CAPA_RECORRIDO, CAPA_PENDIENTE, CAPA_BORDE]) if (map.getLayer(id)) map.removeLayer(id)
      for (const id of [FUENTE_TRAMOS, FUENTE]) if (map.getSource(id)) map.removeSource(id)
    }
  }, [map, isLoaded, ruta])

  // El avance cambia cada segundo: solo se reemplazan los datos de los tramos
  useEffect(() => {
    progresoActual.current = progreso
    if (!map || !isLoaded) return
    ;(map.getSource(FUENTE_TRAMOS) as GeoJSONSource | undefined)?.setData(tramos(ruta, progreso))
  }, [map, isLoaded, ruta, progreso])

  return null
}
