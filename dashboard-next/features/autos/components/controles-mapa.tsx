"use client"

import type { FeatureCollection, LineString } from "geojson"
import { Compass, Maximize, Minus, Plus } from "lucide-react"
import * as MapLibreGL from "maplibre-gl"
import { type ReactNode, useEffect, useState } from "react"

import { useMap } from "@/components/ui/map"

import { limitesDe } from "../ruta-progreso"

const coordenada = new Intl.NumberFormat("es-PE", { minimumFractionDigits: 4, maximumFractionDigits: 4 })

function Boton({
  etiqueta,
  deshabilitado,
  onClick,
  children,
}: {
  etiqueta: string
  deshabilitado?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={etiqueta}
      title={etiqueta}
      disabled={deshabilitado}
      onClick={onClick}
      className="flex size-10 items-center justify-center border-b text-foreground last:border-b-0 hover:bg-accent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring disabled:opacity-40 [&_svg]:size-4"
    >
      {children}
    </button>
  )
}

/**
 * Controles del mapa al estilo Carbon: acercar, alejar, encuadrar la ruta y orientar al norte; la
 * escala de MapLibre y el centro y zoom actuales, que se actualizan al terminar cada movimiento.
 */
export function ControlesMapa({ ruta }: { ruta: FeatureCollection<LineString> | null }) {
  const { map } = useMap()
  const [vista, setVista] = useState<{ lat: number; lon: number; zoom: number } | null>(null)

  useEffect(() => {
    if (!map) return
    const escala = new MapLibreGL.ScaleControl({ unit: "metric", maxWidth: 96 })
    map.addControl(escala, "bottom-left")
    const alMover = () => {
      const { lat, lng } = map.getCenter()
      setVista({ lat, lon: lng, zoom: map.getZoom() })
    }
    alMover()
    map.on("moveend", alMover)
    return () => {
      map.off("moveend", alMover)
      // si el mapa ya se destruyó (desmontaje), MapLibre quitó el control y quitarlo otra vez falla
      if (map.hasControl(escala)) map.removeControl(escala)
    }
  }, [map])

  return (
    <>
      <div className="absolute right-4 bottom-10 z-10 flex flex-col bg-card shadow-md">
        <Boton etiqueta="Acercar" onClick={() => map?.zoomIn()}>
          <Plus />
        </Boton>
        <Boton etiqueta="Alejar" onClick={() => map?.zoomOut()}>
          <Minus />
        </Boton>
        <Boton
          etiqueta="Encuadrar la ruta"
          deshabilitado={!ruta}
          onClick={() => ruta && map?.fitBounds(limitesDe(ruta), { padding: 60, duration: 600 })}
        >
          <Maximize />
        </Boton>
        <Boton etiqueta="Orientar al norte" onClick={() => map?.resetNorthPitch()}>
          <Compass />
        </Boton>
      </div>
      {vista && (
        <div className="pointer-events-none absolute bottom-2 left-1/2 z-10 hidden -translate-x-1/2 bg-card/85 px-2 py-0.5 font-mono text-[11px] text-muted-foreground md:block">
          {coordenada.format(vista.lat)}, {coordenada.format(vista.lon)} · zoom {vista.zoom.toFixed(1)}
        </div>
      )}
    </>
  )
}
