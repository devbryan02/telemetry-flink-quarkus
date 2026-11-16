"use client"

import type { FeatureCollection, LineString, Point } from "geojson"
import type { GeoJSONSource } from "maplibre-gl"
import { useEffect } from "react"

import { useMap } from "@/components/ui/map"

import type { Hueco, Instante, Recorrido } from "../repeticion"

const F_LINEA = "rep-linea"
const F_PUNTOS = "rep-puntos"
const F_ACTUAL = "rep-actual"

/** Valor concreto de una variable CSS del tema; MapLibre no entiende `var(--x)`. */
function token(nombre: string, porDefecto: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(nombre).trim() || porDefecto
}

function linea(r: Recorrido): FeatureCollection<LineString> {
  const coords = r.muestras.map((m) => [m.lon, m.lat])
  return { type: "FeatureCollection", features: coords.length > 1 ? [{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: coords } }] : [] }
}

function puntos(r: Recorrido, hs: Hueco[]): FeatureCollection<Point> {
  const finDeHueco = new Set(hs.map((h) => h.hasta))
  return {
    type: "FeatureCollection",
    features: r.muestras.map((m) => ({
      type: "Feature",
      properties: { hueco: finDeHueco.has(m.ts) },
      geometry: { type: "Point", coordinates: [m.lon, m.lat] },
    })),
  }
}

function actual(i: Instante | null): FeatureCollection<Point> {
  return { type: "FeatureCollection", features: i ? [{ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [i.lon, i.lat] } }] : [] }
}

/** Recorrido, muestras (con los huecos resaltados) y posición actual. Se recrea al cambiar el tema. */
export function RecorridoLayer({ recorrido, huecos, instante, tokenColor }: { recorrido: Recorrido; huecos: Hueco[]; instante: Instante | null; tokenColor: string }) {
  const { map, isLoaded } = useMap()

  useEffect(() => {
    if (!map || !isLoaded || recorrido.muestras.length === 0) return
    if (!map.getSource(F_LINEA)) {
      const texto = token("--cds-text-primary", "#161616")
      const fondo = token("--cds-background", "#ffffff")
      map.addSource(F_LINEA, { type: "geojson", data: linea(recorrido) })
      map.addSource(F_PUNTOS, { type: "geojson", data: puntos(recorrido, huecos) })
      map.addSource(F_ACTUAL, { type: "geojson", data: actual(instante) })
      map.addLayer({ id: `${F_LINEA}-borde`, type: "line", source: F_LINEA, layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": fondo, "line-width": 9 } })
      map.addLayer({ id: F_LINEA, type: "line", source: F_LINEA, layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": texto, "line-width": 4 } })
      map.addLayer({
        id: F_PUNTOS,
        type: "circle",
        source: F_PUNTOS,
        minzoom: 14,
        paint: {
          "circle-radius": ["case", ["get", "hueco"], 7, 2.5],
          "circle-color": fondo,
          "circle-stroke-color": texto,
          "circle-stroke-width": ["case", ["get", "hueco"], 2, 1],
        },
      })
      map.addLayer({ id: F_ACTUAL, type: "circle", source: F_ACTUAL, paint: { "circle-radius": 10, "circle-color": token(tokenColor, "#6929c4"), "circle-stroke-color": "#ffffff", "circle-stroke-width": 2.5 } })
      const xs = recorrido.muestras.map((m) => m.lon)
      const ys = recorrido.muestras.map((m) => m.lat)
      map.fitBounds([[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)]], { padding: 80, duration: 0 })
    } else {
      ;(map.getSource(F_LINEA) as GeoJSONSource).setData(linea(recorrido))
      ;(map.getSource(F_PUNTOS) as GeoJSONSource).setData(puntos(recorrido, huecos))
    }
    // `instante` cambia en cada cuadro: lo pinta el efecto de abajo, no este
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, isLoaded, recorrido, huecos, tokenColor])

  useEffect(() => {
    if (!map || !isLoaded) return
    ;(map.getSource(F_ACTUAL) as GeoJSONSource | undefined)?.setData(actual(instante))
  }, [map, isLoaded, instante])

  return null
}
