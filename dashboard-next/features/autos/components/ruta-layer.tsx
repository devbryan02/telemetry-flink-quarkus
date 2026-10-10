"use client"

import type { FeatureCollection, LineString } from "geojson"
import { useEffect } from "react"

import { useMap } from "@/components/ui/map"

import { CAPA_AUTOS } from "./autos-layer"

const FUENTE = "ruta"
const CAPA = "ruta"

/** Dibuja la ruta simulada (sus dos calzadas) debajo de los autos. */
export function RutaLayer({ ruta }: { ruta: FeatureCollection<LineString> | null }) {
  const { map, isLoaded } = useMap()

  useEffect(() => {
    if (!map || !isLoaded || !ruta) return
    if (map.getSource(FUENTE)) {
      ;(map.getSource(FUENTE) as import("maplibre-gl").GeoJSONSource).setData(ruta)
      return
    }
    map.addSource(FUENTE, { type: "geojson", data: ruta })
    map.addLayer(
      {
        id: CAPA,
        type: "line",
        source: FUENTE,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#38bdf8",
          "line-opacity": 0.55,
          "line-width": ["interpolate", ["linear"], ["zoom"], 11, 2, 15, 5, 18, 10],
        },
      },
      // debajo de los autos si su capa ya existe
      map.getLayer(CAPA_AUTOS) ? CAPA_AUTOS : undefined,
    )
    return () => {
      if (!map.getStyle()) return
      if (map.getLayer(CAPA)) map.removeLayer(CAPA)
      if (map.getSource(FUENTE)) map.removeSource(FUENTE)
    }
  }, [map, isLoaded, ruta])

  return null
}
