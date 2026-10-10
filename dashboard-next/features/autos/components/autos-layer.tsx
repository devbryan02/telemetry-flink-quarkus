"use client"

import type { Point } from "geojson"
import * as MapLibreGL from "maplibre-gl"
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react"

import { useMap } from "@/components/ui/map"

import { expresionFiltro, type Filtro, nombreEmpresa, nombreFlota } from "../filtros"
import type { AutosGeoJSON, PropiedadesAuto } from "../geojson"
import { nombreIcono, registrarIconos } from "../vehiculo"

const FUENTE = "autos"
export const CAPA_AUTOS = "autos"

const VACIO: AutosGeoJSON = { type: "FeatureCollection", features: [] }

export type AutosLayerHandle = {
  /** Reemplaza los datos de la capa. Una sola llamada por repintado. */
  pintar: (datos: AutosGeoJSON) => void
}

const esParticular: MapLibreGL.ExpressionSpecification = ["==", ["get", "companyId"], null]

/**
 * Cada auto es un ícono de vehículo orientado según su rumbo (spec §10): verde/rojo por motor y borde
 * blanco (particular) o celeste (empresa). Siempre visible (sin colisiones) y más grande al acercarse.
 */
const ESTILO_VEHICULO: MapLibreGL.SymbolLayerSpecification["layout"] = {
  "icon-image": [
    "case",
    esParticular,
    ["match", ["get", "engine"], "ON", nombreIcono("on", "p"), nombreIcono("off", "p")],
    ["match", ["get", "engine"], "ON", nombreIcono("on", "e"), nombreIcono("off", "e")],
  ],
  "icon-rotate": ["get", "heading"],
  "icon-rotation-alignment": "map",
  "icon-allow-overlap": true,
  "icon-ignore-placement": true,
  "icon-size": ["interpolate", ["linear"], ["zoom"], 11, 0.5, 14, 0.8, 17, 1.3],
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
    ["Hace", `${Math.max(0, (Date.now() - p.ts) / 1000).toFixed(1)} s`],
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
 * Una fuente GeoJSON con todos los autos y una capa de íconos filtrada por la empresa/flota elegida
 * (spec §10). No crea un nodo React/DOM por auto: los datos se cambian imperativamente con `setData()`.
 */
export const AutosLayer = forwardRef<AutosLayerHandle, { filtro: Filtro }>(function AutosLayer({ filtro }, ref) {
  const { map, isLoaded } = useMap()
  const ultimos = useRef<AutosGeoJSON>(VACIO)
  const filtroActual = useRef(filtro)

  useImperativeHandle(
    ref,
    () => ({
      pintar(datos) {
        ultimos.current = datos
        const fuente = map?.getSource(FUENTE) as MapLibreGL.GeoJSONSource | undefined
        fuente?.setData(datos)
      },
    }),
    [map],
  )

  // Se vuelve a ejecutar cada vez que el estilo termina de cargar: un cambio de tema
  // (claro/oscuro) reemplaza el estilo y borra las fuentes, capas e íconos propios.
  useEffect(() => {
    if (!map || !isLoaded || map.getSource(FUENTE)) return

    registrarIconos(map)
    map.addSource(FUENTE, { type: "geojson", data: ultimos.current })
    map.addLayer({
      id: CAPA_AUTOS,
      type: "symbol",
      source: FUENTE,
      filter: expresionFiltro(filtroActual.current),
      layout: ESTILO_VEHICULO,
    })

    return () => {
      // El mapa puede haberse destruido ya (desmontaje) o cambiado de estilo
      if (!map.getStyle()) return
      if (map.getLayer(CAPA_AUTOS)) map.removeLayer(CAPA_AUTOS)
      if (map.getSource(FUENTE)) map.removeSource(FUENTE)
    }
  }, [map, isLoaded])

  useEffect(() => {
    filtroActual.current = filtro
    if (map?.getLayer(CAPA_AUTOS)) map.setFilter(CAPA_AUTOS, expresionFiltro(filtro))
  }, [map, filtro])

  // Popup solo al pasar el mouse por un auto (spec §10)
  useEffect(() => {
    if (!map) return
    const popup = new MapLibreGL.Popup({ closeButton: false, closeOnClick: false, offset: 12 })

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

    map.on("mouseenter", CAPA_AUTOS, alEntrar)
    map.on("mouseleave", CAPA_AUTOS, alSalir)
    return () => {
      map.off("mouseenter", CAPA_AUTOS, alEntrar)
      map.off("mouseleave", CAPA_AUTOS, alSalir)
      popup.remove()
    }
  }, [map])

  return null
})
