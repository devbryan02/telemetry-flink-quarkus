"use client"

import { IconButton } from "@carbon/react"
import { Add, Compass, FitToScreen, Subtract } from "@carbon/icons-react"
import type { FeatureCollection, LineString } from "geojson"
import * as MapLibreGL from "maplibre-gl"
import { useEffect, useState } from "react"

import { useMap } from "@/components/ui/map"

import { limitesDe } from "../ruta-progreso"

const coordenada = new Intl.NumberFormat("es-PE", { minimumFractionDigits: 4, maximumFractionDigits: 4 })
const zoom = new Intl.NumberFormat("es-PE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const FLOTANTE = "bg-card! text-foreground! shadow-flotante"

/**
 * Controles del mapa con botones de ícono circulares (Carbon v12): acercar, alejar, encuadrar la ruta y
 * orientar al norte; la escala de MapLibre, y el centro y el zoom, que se actualizan al terminar cada movimiento.
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
      <div className="absolute right-4 bottom-4 z-10 flex flex-col gap-2">
        <IconButton label="Acercar" kind="ghost" align="left" className={FLOTANTE} onClick={() => map?.zoomIn()}>
          <Add />
        </IconButton>
        <IconButton label="Alejar" kind="ghost" align="left" className={FLOTANTE} onClick={() => map?.zoomOut()}>
          <Subtract />
        </IconButton>
        <IconButton
          label="Encuadrar la ruta"
          kind="ghost"
          align="left"
          className={FLOTANTE}
          disabled={!ruta}
          onClick={() => ruta && map?.fitBounds(limitesDe(ruta), { padding: 60, duration: 600 })}
        >
          <FitToScreen />
        </IconButton>
        <IconButton label="Orientar al norte" kind="ghost" align="left" className={FLOTANTE} onClick={() => map?.resetNorthPitch()}>
          <Compass />
        </IconButton>
      </div>
      {vista && (
        <div className="pointer-events-none absolute bottom-4 left-1/2 z-10 hidden h-7 -translate-x-1/2 items-center rounded-full bg-card px-3 font-mono text-xs text-muted-foreground shadow-flotante md:flex">
          {coordenada.format(vista.lat)}, {coordenada.format(vista.lon)} · zoom {zoom.format(vista.zoom)}
        </div>
      )}
    </>
  )
}
