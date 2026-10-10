"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { Map } from "@/components/ui/map"

import { obtenerAutos } from "../api"
import { aGeoJSON } from "../geojson"
import { useAutosSocket, type EstadoConexion } from "../hooks/use-autos-socket"
import { Metricas } from "../metricas"
import type { Auto } from "../types"
import { AutosLayer, type AutosLayerHandle } from "./autos-layer"
import { AutosStats, type ResumenMetricas } from "./autos-stats"

const LIMA: [number, number] = [-77.0428, -12.0464]
const WS_URL = process.env.NEXT_PUBLIC_WS_URL

/** Mapa a pantalla completa con la flota en tiempo real (spec §10). */
export default function AutosMap() {
  const capa = useRef<AutosLayerHandle>(null)
  // El estado de la flota vive fuera de React: con 10.000 autos no se rerenderiza por cada cambio
  const autos = useRef(new globalThis.Map<string, Auto>())
  const metricas = useRef(new Metricas())
  const repintado = useRef<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  /** Agrupa todos los cambios recibidos hasta el próximo frame en un único setData() (RF-U3). */
  const programarRepintado = useCallback(() => {
    if (repintado.current !== null) return
    repintado.current = requestAnimationFrame(() => {
      repintado.current = null
      capa.current?.pintar(aGeoJSON(autos.current.values()))
    })
  }, [])

  /** Fusiona por carId: solo reemplaza si el evento es más reciente. */
  const fusionar = useCallback(
    (lista: Auto[]) => {
      for (const auto of lista) {
        const actual = autos.current.get(auto.carId)
        if (!actual || auto.ts > actual.ts) autos.current.set(auto.carId, auto)
      }
      programarRepintado()
    },
    [programarRepintado],
  )

  const alRecibirLote = useCallback(
    (lote: Auto[]) => {
      metricas.current.registrarLote(lote)
      fusionar(lote)
    },
    [fusionar],
  )

  const conexion = useAutosSocket(WS_URL, alRecibirLote)

  useEffect(() => {
    const control = new AbortController()
    obtenerAutos(control.signal)
      .then(fusionar)
      .catch((e: unknown) => {
        if (!control.signal.aborted) setError(e instanceof Error ? e.message : "Error desconocido")
      })
    return () => {
      control.abort()
      if (repintado.current !== null) cancelAnimationFrame(repintado.current)
    }
  }, [fusionar])

  const resumir = useCallback(
    (): ResumenMetricas => ({
      total: autos.current.size,
      visibles: capa.current?.visibles(autos.current.values()) ?? 0,
      lotesPorSegundo: metricas.current.lotesPorSegundo(),
      edadUltimoDatoMs: metricas.current.edadUltimoDato(),
      latenciaP95Ms: metricas.current.latenciaP95(),
    }),
    [],
  )

  return (
    <div className="relative h-full w-full">
      <Map center={LIMA} zoom={11}>
        <AutosLayer ref={capa} />
      </Map>
      <div className="absolute top-3 left-3 z-10">
        <PanelMetricas resumir={resumir} conexion={conexion} error={error} />
      </div>
    </div>
  )
}

/** Refresca los contadores una vez por segundo sin rerenderizar el mapa. */
function PanelMetricas({
  resumir,
  conexion,
  error,
}: {
  resumir: () => ResumenMetricas
  conexion: EstadoConexion
  error: string | null
}) {
  const [resumen, setResumen] = useState<ResumenMetricas>({
    total: 0,
    visibles: 0,
    lotesPorSegundo: 0,
    edadUltimoDatoMs: null,
    latenciaP95Ms: null,
  })

  useEffect(() => {
    const id = setInterval(() => setResumen(resumir()), 1_000)
    return () => clearInterval(id)
  }, [resumir])

  return <AutosStats metricas={resumen} conexion={conexion} error={error} />
}
