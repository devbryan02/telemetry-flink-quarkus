"use client"

import { useEffect, useRef, useState } from "react"

import { Card, CardContent } from "@/components/ui/card"
import { Map } from "@/components/ui/map"

import { obtenerAutos } from "../api"
import { aGeoJSON } from "../geojson"
import type { Auto } from "../types"
import { AutosLayer, type AutosLayerHandle } from "./autos-layer"

const LIMA: [number, number] = [-77.0428, -12.0464]

type Estado = { tipo: "cargando" } | { tipo: "listo"; autos: number } | { tipo: "error"; mensaje: string }

/** Mapa a pantalla completa con la flota (spec §10, RF-U1). */
export default function AutosMap() {
  const capa = useRef<AutosLayerHandle>(null)
  // El estado de la flota vive fuera de React: con 10.000 autos no se rerenderiza por cada cambio
  const autos = useRef(new globalThis.Map<string, Auto>())
  const [estado, setEstado] = useState<Estado>({ tipo: "cargando" })

  useEffect(() => {
    const control = new AbortController()
    obtenerAutos(control.signal)
      .then((lista) => {
        for (const auto of lista) autos.current.set(auto.carId, auto)
        capa.current?.pintar(aGeoJSON(autos.current.values()))
        setEstado({ tipo: "listo", autos: autos.current.size })
      })
      .catch((error: unknown) => {
        if (control.signal.aborted) return
        setEstado({
          tipo: "error",
          mensaje: error instanceof Error ? error.message : "Error desconocido",
        })
      })
    return () => control.abort()
  }, [])

  return (
    <div className="relative h-full w-full">
      <Map center={LIMA} zoom={11}>
        <AutosLayer ref={capa} />
      </Map>
      <Card size="sm" className="absolute top-3 left-3 z-10">
        <CardContent className="text-sm">
          {estado.tipo === "cargando" && "Cargando autos…"}
          {estado.tipo === "listo" && `${estado.autos.toLocaleString("es-PE")} autos`}
          {estado.tipo === "error" && (
            <span className="text-destructive">No se pudo cargar la flota: {estado.mensaje}</span>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
