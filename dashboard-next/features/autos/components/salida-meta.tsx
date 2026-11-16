"use client"

import type { FeatureCollection, LineString } from "geojson"
import { Flag, PlayFilledAlt } from "@carbon/icons-react"
import type { ReactNode } from "react"

import { MapMarker, MarkerContent } from "@/components/ui/map"
import { cn } from "@/lib/utils"

/** Círculo con ícono en el extremo de la ruta y, al lado, una etiqueta con el nombre del lugar. */
function Extremo({ icono, circulo, titulo, lugar }: { icono: ReactNode; circulo: string; titulo: string; lugar?: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn("flex size-6 items-center justify-center rounded-full border-2 shadow-md", circulo)}>
        {icono}
      </span>
      <span className="flex flex-col bg-card px-2 py-1 text-xs leading-4 text-card-foreground shadow-md">
        <span className="font-semibold">{titulo}</span>
        {lugar && <span className="text-muted-foreground">{lugar}</span>}
      </span>
    </div>
  )
}

/** Marcadores de salida y meta en los extremos de la ruta, con el nombre de cada lugar. */
export function SalidaMeta({
  ruta,
  desde,
  hasta,
}: {
  ruta: FeatureCollection<LineString> | null
  desde?: string
  hasta?: string
}) {
  const linea = ruta?.features[0]?.geometry.coordinates
  if (!linea || linea.length < 2) return null
  const [salida, meta] = [linea[0], linea[linea.length - 1]]
  // anchor "left" con un pequeño margen: el marcador queda a la derecha del extremo y no tapa a los
  // autos detenidos en la salida o en la meta
  return (
    <>
      <MapMarker longitude={salida[0]} latitude={salida[1]} anchor="left" offset={[14, 0]}>
        <MarkerContent>
          <Extremo
            icono={<PlayFilledAlt className="size-3 fill-current" />}
            circulo="border-foreground bg-card text-foreground"
            titulo="Salida"
            lugar={desde}
          />
        </MarkerContent>
      </MapMarker>
      <MapMarker longitude={meta[0]} latitude={meta[1]} anchor="left" offset={[14, 0]}>
        <MarkerContent>
          <Extremo
            icono={<Flag className="size-3" />}
            circulo="border-card bg-foreground text-background"
            titulo="Meta"
            lugar={hasta}
          />
        </MarkerContent>
      </MapMarker>
    </>
  )
}
