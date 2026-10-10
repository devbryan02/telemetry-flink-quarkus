"use client"

import type { LngLatBoundsLike } from "maplibre-gl"
import { useCallback, useEffect, useRef, useState } from "react"

import { Map, type MapRef, type MapViewport } from "@/components/ui/map"

import { type Grupo, type ResumenFlota, resumirEmpresas, resumirFlotas } from "../agrupar"
import { obtenerAutos } from "../api"
import { aGeoJSON } from "../geojson"
import { useAutosSocket, type EstadoConexion } from "../hooks/use-autos-socket"
import { Metricas } from "../metricas"
import type { Auto } from "../types"
import { AutosLayer, type AutosLayerHandle, ZOOM_AUTOS } from "./autos-layer"
import { AutosStats, type ResumenMetricas } from "./autos-stats"
import { Burbujas } from "./burbuja"

const LIMA: [number, number] = [-77.0428, -12.0464]
const ZOOM_INICIAL = 11
const WS_URL = process.env.NEXT_PUBLIC_WS_URL
/** Las burbujas se recalculan con cada repintado, pero se publican al estado como mucho cada 500 ms. */
const REFRESCO_BURBUJAS_MS = 500

type Agrupacion = ResumenFlota & { flotas: Grupo[] }
const SIN_DATOS: Agrupacion = { empresas: [], flotasTotal: 0, particulares: 0, flotas: [] }

/**
 * Mapa a pantalla completa (spec §10). Sin empresa seleccionada: una burbuja por empresa y los
 * particulares sueltos. Con una empresa: sus flotas como burbujas y, desde ZOOM_AUTOS, sus autos.
 */
export default function AutosMap() {
  const mapa = useRef<MapRef>(null)
  const capa = useRef<AutosLayerHandle>(null)
  // El estado de la flota vive fuera de React: con 10.000 autos no se rerenderiza por cada cambio
  const autos = useRef(new globalThis.Map<string, Auto>())
  const metricas = useRef(new Metricas())
  const repintado = useRef<number | null>(null)
  const ultimaAgrupacion = useRef(0)
  const [error, setError] = useState<string | null>(null)
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState<string | null>(null)
  const seleccion = useRef<string | null>(null)
  const [agrupacion, setAgrupacion] = useState<Agrupacion>(SIN_DATOS)
  const [zoomAutos, setZoomAutos] = useState(false)

  const agrupar = useCallback((forzar = false) => {
    const ahora = performance.now()
    if (!forzar && ahora - ultimaAgrupacion.current < REFRESCO_BURBUJAS_MS) return
    ultimaAgrupacion.current = ahora
    const empresa = seleccion.current
    setAgrupacion({
      ...resumirEmpresas(autos.current.values()),
      flotas: empresa ? resumirFlotas(autos.current.values(), empresa) : [],
    })
  }, [])

  /** Agrupa todos los cambios recibidos hasta el próximo frame en un único setData() (RF-U3). */
  const programarRepintado = useCallback(() => {
    if (repintado.current !== null) return
    repintado.current = requestAnimationFrame(() => {
      repintado.current = null
      capa.current?.pintar(aGeoJSON(autos.current.values()))
      agrupar()
    })
  }, [agrupar])

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

  const encuadrar = useCallback((limites: Grupo["limites"], zoomMinimo?: number) => {
    const m = mapa.current
    if (!m) return
    const camara = m.cameraForBounds(limites as LngLatBoundsLike, { padding: 80, maxZoom: 16 })
    if (!camara) return
    m.easeTo({ ...camara, zoom: Math.max(camara.zoom ?? ZOOM_INICIAL, zoomMinimo ?? 0), duration: 800 })
  }, [])

  const seleccionarEmpresa = useCallback(
    (companyId: string | null) => {
      seleccion.current = companyId
      setEmpresaSeleccionada(companyId)
      agrupar(true)
      if (companyId) {
        const empresa = resumirEmpresas(autos.current.values()).empresas.find((e) => e.id === companyId)
        if (empresa) encuadrar(empresa.limites)
      } else {
        mapa.current?.easeTo({ center: LIMA, zoom: ZOOM_INICIAL, duration: 800 })
      }
    },
    [agrupar, encuadrar],
  )

  const alMoverMapa = useCallback((vista: MapViewport) => setZoomAutos(vista.zoom >= ZOOM_AUTOS), [])

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
      <Map ref={mapa} center={LIMA} zoom={ZOOM_INICIAL} onViewportChange={alMoverMapa}>
        <AutosLayer ref={capa} empresaSeleccionada={empresaSeleccionada} />
        {!empresaSeleccionada && (
          <Burbujas
            grupos={agrupacion.empresas}
            variante="empresa"
            onSeleccionar={(g) => seleccionarEmpresa(g.id)}
          />
        )}
        {empresaSeleccionada && !zoomAutos && (
          <Burbujas
            grupos={agrupacion.flotas}
            variante="flota"
            onSeleccionar={(g) => encuadrar(g.limites, ZOOM_AUTOS + 0.2)}
          />
        )}
      </Map>
      <div className="absolute top-3 left-3 z-10">
        <PanelMetricas
          resumir={resumir}
          conexion={conexion}
          error={error}
          agrupacion={agrupacion}
          empresaSeleccionada={empresaSeleccionada}
          onSeleccionarEmpresa={seleccionarEmpresa}
        />
      </div>
    </div>
  )
}

/** Refresca los contadores una vez por segundo sin rerenderizar el mapa. */
function PanelMetricas({
  resumir,
  conexion,
  error,
  agrupacion,
  empresaSeleccionada,
  onSeleccionarEmpresa,
}: {
  resumir: () => ResumenMetricas
  conexion: EstadoConexion
  error: string | null
  agrupacion: Agrupacion
  empresaSeleccionada: string | null
  onSeleccionarEmpresa: (companyId: string | null) => void
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

  return (
    <AutosStats
      metricas={resumen}
      conexion={conexion}
      error={error}
      empresas={agrupacion.empresas}
      flotasTotal={agrupacion.flotasTotal}
      particulares={agrupacion.particulares}
      empresaSeleccionada={empresaSeleccionada}
      flotasEmpresa={agrupacion.flotas.length}
      onSeleccionarEmpresa={onSeleccionarEmpresa}
    />
  )
}
