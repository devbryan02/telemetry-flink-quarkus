"use client"

import type { Point } from "geojson"
import * as MapLibreGL from "maplibre-gl"
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react"

import { useMap } from "@/components/ui/map"

import { expresionFiltro, type Filtro, nombreEmpresa, nombreFlota } from "../filtros"
import type { AutosGeoJSON, PropiedadesAuto } from "../geojson"
import { leerToken } from "../tokens"
import { nombreIcono, registrarIconos } from "../vehiculo"

const FUENTE = "autos"
export const CAPA_AUTOS = "autos"

const VACIO: AutosGeoJSON = { type: "FeatureCollection", features: [] }

export type AutosLayerHandle = {
  /** Reemplaza los datos de la capa. Una sola llamada por repintado. */
  pintar: (datos: AutosGeoJSON) => void
}

/** Etiqueta del primero de la carrera, que acompaña a su marcador en el mapa. */
export type Lider = { carId: string; texto: string }

const CAPA_LIDER = "autos-lider"
const FUENTE_TEXTO = ["Open Sans Bold"] // disponible en los estilos de CARTO
const motorApagado: MapLibreGL.ExpressionSpecification = ["==", ["get", "engine"], "OFF"]

/**
 * Cada auto es un círculo con su color categórico (`--auto-N`), su número y una flecha de rumbo
 * (spec §10). Con el motor apagado (llegó a la meta) se ve gris. Siempre visible y más grande al acercarse.
 */
const ESTILO_VEHICULO: MapLibreGL.SymbolLayerSpecification["layout"] = {
  "icon-image": ["case", motorApagado, nombreIcono("off"), ["concat", "auto-", ["to-string", ["get", "color"]]]],
  "icon-rotate": ["get", "heading"],
  "icon-rotation-alignment": "map",
  "icon-allow-overlap": true,
  "icon-ignore-placement": true,
  "icon-size": ["interpolate", ["linear"], ["zoom"], 11, 0.8, 14, 1, 17, 1.3],
  "text-field": ["get", "numero"],
  "text-font": FUENTE_TEXTO,
  "text-size": ["interpolate", ["linear"], ["zoom"], 11, 9, 14, 11, 17, 14],
  "text-allow-overlap": true,
  "text-ignore-placement": true,
  "text-rotation-alignment": "viewport",
}

/** Color del número según el fondo del círculo, para mantener contraste en cada tema. */
function colorNumero(): MapLibreGL.ExpressionSpecification {
  const oscuro = document.documentElement.classList.contains("dark")
  // claro: blanco sobre morado y negro sobre cian, amarillo y gris; oscuro: negro sobre la paleta clara
  return ["case", motorApagado, oscuro ? "#ffffff" : "#161616", ["==", ["get", "color"], 1], oscuro ? "#161616" : "#ffffff", "#161616"]
}

/** Solo el líder, y solo si pasa el filtro de empresa/flota. */
function filtroLider(filtro: Filtro, lider: Lider | null): MapLibreGL.FilterSpecification {
  // expresionFiltro solo produce expresiones (no filtros legados), así que pueden combinarse con "all"
  return ["all", expresionFiltro(filtro) as MapLibreGL.ExpressionSpecification, ["==", ["get", "carId"], lider?.carId ?? ""]]
}

/** Contenido del popup construido con nodos de texto (sin HTML interpolado). */
function contenidoPopup(p: PropiedadesAuto): HTMLElement {
  const raiz = document.createElement("div")
  // mapcn deja el contenedor del popup transparente: el fondo y el color salen de los tokens del tema
  raiz.className = "rounded-md border bg-popover px-2.5 py-1.5 text-xs leading-5 text-popover-foreground shadow-md"
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
export const AutosLayer = forwardRef<AutosLayerHandle, { filtro: Filtro; lider: Lider | null }>(function AutosLayer(
  { filtro, lider },
  ref,
) {
  const { map, isLoaded } = useMap()
  const ultimos = useRef<AutosGeoJSON>(VACIO)
  const filtroActual = useRef(filtro)
  const liderActual = useRef(lider)

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
      paint: { "text-color": colorNumero() },
    })
    map.addLayer({
      id: CAPA_LIDER,
      type: "symbol",
      source: FUENTE,
      filter: filtroLider(filtroActual.current, liderActual.current),
      layout: {
        "text-field": liderActual.current?.texto ?? "",
        "text-font": FUENTE_TEXTO,
        "text-size": 12,
        "text-anchor": "left",
        "text-justify": "left",
        "text-offset": [1.4, 0],
        "text-allow-overlap": true,
        "text-ignore-placement": true,
        visibility: liderActual.current ? "visible" : "none",
      },
      paint: {
        "text-color": leerToken("--foreground", "#161616"),
        "text-halo-color": leerToken("--card", "#ffffff"),
        "text-halo-width": 2,
      },
    })

    return () => {
      // El mapa puede haberse destruido ya (desmontaje) o cambiado de estilo
      if (!map.getStyle()) return
      if (map.getLayer(CAPA_LIDER)) map.removeLayer(CAPA_LIDER)
      if (map.getLayer(CAPA_AUTOS)) map.removeLayer(CAPA_AUTOS)
      if (map.getSource(FUENTE)) map.removeSource(FUENTE)
    }
  }, [map, isLoaded])

  useEffect(() => {
    filtroActual.current = filtro
    if (map?.getLayer(CAPA_AUTOS)) map.setFilter(CAPA_AUTOS, expresionFiltro(filtro))
    if (map?.getLayer(CAPA_LIDER)) map.setFilter(CAPA_LIDER, filtroLider(filtro, liderActual.current))
  }, [map, filtro])

  // El líder y su texto cambian con el sondeo de la carrera (1 s)
  useEffect(() => {
    liderActual.current = lider
    if (!map?.getLayer(CAPA_LIDER)) return
    map.setFilter(CAPA_LIDER, filtroLider(filtroActual.current, lider))
    map.setLayoutProperty(CAPA_LIDER, "text-field", lider?.texto ?? "")
    map.setLayoutProperty(CAPA_LIDER, "visibility", lider ? "visible" : "none")
  }, [map, lider])

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
