"use client"

import type { GeoJSONSource } from "maplibre-gl"
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react"

import { useMap } from "@/components/ui/map"

import type { AutosGeoJSON } from "../geojson"

const FUENTE = "autos"
const CAPA = "autos"

const VACIO: AutosGeoJSON = { type: "FeatureCollection", features: [] }

export type AutosLayerHandle = {
  /** Reemplaza los datos de la capa. Una sola llamada por repintado. */
  pintar: (datos: AutosGeoJSON) => void
}

/**
 * Una fuente GeoJSON y una capa `circle` de MapLibre (WebGL) para toda la flota (spec §10, RF-U2).
 * No crea un nodo React/DOM por auto: los datos se cambian imperativamente con `setData()`.
 */
export const AutosLayer = forwardRef<AutosLayerHandle>(function AutosLayer(_, ref) {
  const { map, isLoaded } = useMap()
  const ultimos = useRef<AutosGeoJSON>(VACIO)

  useImperativeHandle(
    ref,
    () => ({
      pintar(datos) {
        ultimos.current = datos
        const fuente = map?.getSource(FUENTE) as GeoJSONSource | undefined
        fuente?.setData(datos)
      },
    }),
    [map],
  )

  // Se vuelve a ejecutar cada vez que el estilo termina de cargar: un cambio de tema
  // (claro/oscuro) reemplaza el estilo y borra las fuentes y capas propias.
  useEffect(() => {
    if (!map || !isLoaded || map.getSource(FUENTE)) return

    map.addSource(FUENTE, { type: "geojson", data: ultimos.current })
    map.addLayer({
      id: CAPA,
      type: "circle",
      source: FUENTE,
      paint: {
        "circle-radius": 3.5,
        "circle-color": ["match", ["get", "engine"], "ON", "#16a34a", "#dc2626"],
        "circle-stroke-width": 0.5,
        "circle-stroke-color": "#ffffff",
      },
    })

    return () => {
      // El mapa puede haberse destruido ya (desmontaje) o cambiado de estilo
      if (!map.getStyle()) return
      if (map.getLayer(CAPA)) map.removeLayer(CAPA)
      if (map.getSource(FUENTE)) map.removeSource(FUENTE)
    }
  }, [map, isLoaded])

  return null
})
