"use client"

import type { Point } from "geojson"
import * as MapLibreGL from "maplibre-gl"
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react"

import { useMap } from "@/components/ui/map"

import { nombreEmpresa, nombreFlota } from "../agrupar"
import type { AutosGeoJSON, PropiedadesAuto } from "../geojson"
import type { Auto } from "../types"

const FUENTE = "autos"
const CAPA_PARTICULARES = "autos-particulares"
const CAPA_EMPRESA = "autos-empresa"
/** Desde este zoom los autos de la empresa seleccionada se ven uno a uno (antes, sus burbujas de flota). */
export const ZOOM_AUTOS = 14

const VACIO: AutosGeoJSON = { type: "FeatureCollection", features: [] }
const SIN_EMPRESA = "__ninguna__"

export type AutosLayerHandle = {
  /** Reemplaza los datos de la capa. Una sola llamada por repintado. */
  pintar: (datos: AutosGeoJSON) => void
  /** Cuántos autos caen dentro del área visible del mapa. */
  visibles: (autos: Iterable<Auto>) => number
}

const ESTILO_AUTO: MapLibreGL.CircleLayerSpecification["paint"] = {
  "circle-radius": 3.5,
  "circle-color": ["match", ["get", "engine"], "ON", "#16a34a", "#dc2626"],
  "circle-stroke-width": 0.5,
  "circle-stroke-color": "#ffffff",
}

/** Contenido del popup construido con nodos de texto (sin HTML interpolado). */
function contenidoPopup(p: PropiedadesAuto): HTMLElement {
  const raiz = document.createElement("div")
  raiz.className = "text-xs leading-5 text-neutral-900"
  const lineas: [string, string][] = [
    ["Auto", p.carId],
    ["Empresa", p.companyId ? nombreEmpresa(p.companyId) : "Particular"],
    ...(p.fleetId ? ([["Flota", nombreFlota(p.fleetId)]] as [string, string][]) : []),
    ["Motor", p.engine],
    ["Batería", `${p.battery} %`],
    ["Hace", `${((Date.now() - p.ts) / 1000).toFixed(1)} s`],
  ]
  for (const [etiqueta, valor] of lineas) {
    const fila = document.createElement("div")
    const b = document.createElement("b")
    b.textContent = `${etiqueta}: `
    fila.append(b, valor)
    raiz.append(fila)
  }
  return raiz
}

/**
 * Una fuente GeoJSON con toda la flota y dos capas filtradas sobre ella (spec §10):
 * los particulares siempre, y los autos de la empresa seleccionada solo desde ZOOM_AUTOS.
 * Los autos de las demás empresas no se dibujan uno a uno: los representan sus burbujas.
 * No crea un nodo React/DOM por auto: los datos se cambian imperativamente con `setData()`.
 */
export const AutosLayer = forwardRef<AutosLayerHandle, { empresaSeleccionada: string | null }>(function AutosLayer(
  { empresaSeleccionada },
  ref,
) {
  const { map, isLoaded } = useMap()
  const ultimos = useRef<AutosGeoJSON>(VACIO)
  const empresa = useRef(empresaSeleccionada)

  useImperativeHandle(
    ref,
    () => ({
      pintar(datos) {
        ultimos.current = datos
        const fuente = map?.getSource(FUENTE) as MapLibreGL.GeoJSONSource | undefined
        fuente?.setData(datos)
      },
      visibles(autos) {
        if (!map) return 0
        const limites = map.getBounds()
        let n = 0
        for (const a of autos) if (limites.contains([a.lon, a.lat])) n++
        return n
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
      id: CAPA_PARTICULARES,
      type: "circle",
      source: FUENTE,
      filter: ["==", ["get", "companyId"], null],
      paint: ESTILO_AUTO,
    })
    map.addLayer({
      id: CAPA_EMPRESA,
      type: "circle",
      source: FUENTE,
      minzoom: ZOOM_AUTOS,
      filter: ["==", ["get", "companyId"], empresa.current ?? SIN_EMPRESA],
      paint: ESTILO_AUTO,
    })

    return () => {
      // El mapa puede haberse destruido ya (desmontaje) o cambiado de estilo
      if (!map.getStyle()) return
      for (const capa of [CAPA_EMPRESA, CAPA_PARTICULARES]) if (map.getLayer(capa)) map.removeLayer(capa)
      if (map.getSource(FUENTE)) map.removeSource(FUENTE)
    }
  }, [map, isLoaded])

  useEffect(() => {
    empresa.current = empresaSeleccionada
    if (map?.getLayer(CAPA_EMPRESA)) {
      map.setFilter(CAPA_EMPRESA, ["==", ["get", "companyId"], empresaSeleccionada ?? SIN_EMPRESA])
    }
  }, [map, empresaSeleccionada])

  // Popup solo al pasar el mouse por un auto, no uno por cada auto (spec §10, RF-U5)
  useEffect(() => {
    if (!map) return
    const popup = new MapLibreGL.Popup({ closeButton: false, closeOnClick: false, offset: 8 })

    const alEntrar = (e: MapLibreGL.MapLayerMouseEvent) => {
      const feature = e.features?.[0]
      if (!feature) return
      map.getCanvas().style.cursor = "pointer"
      const [lon, lat] = (feature.geometry as Point).coordinates
      popup
        .setLngLat([lon, lat])
        .setDOMContent(contenidoPopup(feature.properties as PropiedadesAuto))
        .addTo(map)
    }
    const alSalir = () => {
      map.getCanvas().style.cursor = ""
      popup.remove()
    }

    for (const capa of [CAPA_PARTICULARES, CAPA_EMPRESA]) {
      map.on("mouseenter", capa, alEntrar)
      map.on("mouseleave", capa, alSalir)
    }
    return () => {
      for (const capa of [CAPA_PARTICULARES, CAPA_EMPRESA]) {
        map.off("mouseenter", capa, alEntrar)
        map.off("mouseleave", capa, alSalir)
      }
      popup.remove()
    }
  }, [map])

  return null
})
