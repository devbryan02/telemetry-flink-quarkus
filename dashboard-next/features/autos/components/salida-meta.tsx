"use client"

import type { FeatureCollection, LineString } from "geojson"

import { MapMarker, MarkerContent } from "@/components/ui/map"

function Etiqueta({ texto, color }: { texto: string; color: string }) {
  return (
    <div className={`rounded-md border-2 border-white px-1.5 py-0.5 text-[11px] font-semibold text-white shadow ${color}`}>
      {texto}
    </div>
  )
}

/** Marcadores de salida y meta en los extremos de la ruta. */
export function SalidaMeta({ ruta }: { ruta: FeatureCollection<LineString> | null }) {
  const linea = ruta?.features[0]?.geometry.coordinates
  if (!linea || linea.length < 2) return null
  const [salida, meta] = [linea[0], linea[linea.length - 1]]
  return (
    <>
      <MapMarker longitude={salida[0]} latitude={salida[1]} anchor="bottom">
        <MarkerContent>
          <Etiqueta texto="Salida" color="bg-sky-600" />
        </MarkerContent>
      </MapMarker>
      <MapMarker longitude={meta[0]} latitude={meta[1]} anchor="bottom">
        <MarkerContent>
          <Etiqueta texto="🏁 Meta" color="bg-neutral-900" />
        </MarkerContent>
      </MapMarker>
    </>
  )
}
