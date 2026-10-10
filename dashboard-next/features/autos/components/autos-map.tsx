"use client"

import type { FeatureCollection, LineString } from "geojson"
import type { LngLatBoundsLike } from "maplibre-gl"
import { useCallback, useEffect, useRef, useState } from "react"

import { Map, type MapRef } from "@/components/ui/map"

import { Animador } from "../animacion"
import { detenerSimulacion, iniciarSimulacion, obtenerAutos, obtenerRuta, obtenerSimulacion } from "../api"
import { cumpleFiltro, empresasDisponibles, type Filtro, flotasDisponibles, type Opcion, SIN_FILTRO } from "../filtros"
import { aGeoJSON } from "../geojson"
import { useAutosSocket, type EstadoConexion } from "../hooks/use-autos-socket"
import { Metricas } from "../metricas"
import type { Auto, EstadoSimulacion } from "../types"
import { AutosLayer, type AutosLayerHandle } from "./autos-layer"
import { AutosStats, type ResumenMetricas } from "./autos-stats"
import { RutaLayer } from "./ruta-layer"

const RUTA = "av-brasil"
const CENTRO_AV_BRASIL: [number, number] = [-77.057, -12.079]
const WS_URL = process.env.NEXT_PUBLIC_WS_URL

function limitesDe(ruta: FeatureCollection<LineString>): LngLatBoundsLike {
  let [minLon, minLat, maxLon, maxLat] = [180, 90, -180, -90]
  for (const f of ruta.features) {
    for (const [lon, lat] of f.geometry.coordinates) {
      minLon = Math.min(minLon, lon)
      minLat = Math.min(minLat, lat)
      maxLon = Math.max(maxLon, lon)
      maxLat = Math.max(maxLat, lat)
    }
  }
  return [
    [minLon, minLat],
    [maxLon, maxLat],
  ]
}

function mensaje(e: unknown): string {
  return e instanceof Error ? e.message : "Error desconocido"
}

/** Mapa de la Av. Brasil con los autos simulados, filtrables por empresa y flota (spec §10). */
export default function AutosMap() {
  const mapa = useRef<MapRef>(null)
  const capa = useRef<AutosLayerHandle>(null)
  // El estado de los autos vive fuera de React; el Animador interpola su movimiento entre eventos
  const autos = useRef(new globalThis.Map<string, Auto>())
  const animador = useRef(new Animador())
  const metricas = useRef(new Metricas())
  const cuadro = useRef<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ruta, setRuta] = useState<FeatureCollection<LineString> | null>(null)
  const [filtro, setFiltro] = useState<Filtro>(SIN_FILTRO)
  const filtroActual = useRef(filtro)
  const [simulacion, setSimulacion] = useState<EstadoSimulacion | null>(null)
  const [ocupado, setOcupado] = useState(false)

  /** Repinta en cada frame mientras algún auto esté en camino; luego se detiene solo. */
  const animar = useCallback(() => {
    if (cuadro.current !== null) return
    const paso = () => {
      const ahora = performance.now()
      capa.current?.pintar(aGeoJSON(animador.current.posiciones(ahora)))
      cuadro.current = animador.current.enMovimiento(ahora) ? requestAnimationFrame(paso) : null
    }
    cuadro.current = requestAnimationFrame(paso)
  }, [])

  /** Fusiona por carId: solo acepta el evento si es más reciente que el guardado. */
  const fusionar = useCallback(
    (lista: Auto[]) => {
      const ahora = performance.now()
      for (const auto of lista) {
        const actual = autos.current.get(auto.carId)
        if (actual && auto.ts <= actual.ts) continue
        autos.current.set(auto.carId, auto)
        animador.current.actualizar(auto, ahora)
      }
      animar()
    },
    [animar],
  )

  const alRecibirLote = useCallback(
    (lote: Auto[]) => {
      metricas.current.registrarLote(lote)
      fusionar(lote)
    },
    [fusionar],
  )

  const conexion = useAutosSocket(WS_URL, alRecibirLote)

  // Carga inicial: autos y ruta
  useEffect(() => {
    const control = new AbortController()
    obtenerAutos(control.signal)
      .then(fusionar)
      .catch((e: unknown) => {
        if (!control.signal.aborted) setError(`No se pudo cargar la flota: ${mensaje(e)}`)
      })
    obtenerRuta(RUTA, control.signal)
      .then(setRuta)
      .catch((e: unknown) => {
        if (!control.signal.aborted) setError(`No se pudo cargar la ruta: ${mensaje(e)}`)
      })
    return () => {
      control.abort()
      if (cuadro.current !== null) cancelAnimationFrame(cuadro.current)
    }
  }, [fusionar])

  // Estado de la simulación: al inicio y cada 5 s (pudo iniciarse o detenerse desde otra pestaña)
  useEffect(() => {
    const consultar = () =>
      obtenerSimulacion()
        .then(setSimulacion)
        .catch(() => setSimulacion(null))
    consultar()
    const id = setInterval(consultar, 5_000)
    return () => clearInterval(id)
  }, [])

  // Encuadrar la Av. Brasil cuando llega su geometría
  useEffect(() => {
    if (ruta) mapa.current?.fitBounds(limitesDe(ruta), { padding: 60, duration: 0 })
  }, [ruta])

  const alternarSimulacion = useCallback(async () => {
    setOcupado(true)
    try {
      setSimulacion(await (simulacion?.enCurso ? detenerSimulacion() : iniciarSimulacion()))
      setError(null)
    } catch (e) {
      setError(`No se pudo cambiar la simulación: ${mensaje(e)}`)
    } finally {
      setOcupado(false)
    }
  }, [simulacion])

  const cambiarFiltro = useCallback((nuevo: Filtro) => {
    filtroActual.current = nuevo
    setFiltro(nuevo)
  }, [])

  const resumir = useCallback((): ResumenMetricas => {
    let mostrados = 0
    for (const a of autos.current.values()) if (cumpleFiltro(a, filtroActual.current)) mostrados++
    return {
      total: autos.current.size,
      mostrados,
      lotesPorSegundo: metricas.current.lotesPorSegundo(),
      edadUltimoDatoMs: metricas.current.edadUltimoDato(),
      latenciaP95Ms: metricas.current.latenciaP95(),
    }
  }, [])

  const opciones = useCallback(
    (): { empresas: Opcion[]; flotas: Opcion[] } => ({
      empresas: empresasDisponibles(autos.current.values()),
      flotas: filtroActual.current.empresa
        ? flotasDisponibles(autos.current.values(), filtroActual.current.empresa)
        : [],
    }),
    [],
  )

  return (
    <div className="relative h-full w-full">
      <Map ref={mapa} center={CENTRO_AV_BRASIL} zoom={14}>
        <RutaLayer ruta={ruta} />
        <AutosLayer ref={capa} filtro={filtro} />
      </Map>
      <div className="absolute top-3 left-3 z-10">
        <PanelMetricas
          resumir={resumir}
          opciones={opciones}
          conexion={conexion}
          error={error}
          simulacion={simulacion}
          ocupado={ocupado}
          onAlternarSimulacion={alternarSimulacion}
          filtro={filtro}
          onCambiarFiltro={cambiarFiltro}
        />
      </div>
    </div>
  )
}

/** Refresca contadores y opciones de los selectores una vez por segundo sin rerenderizar el mapa. */
function PanelMetricas({
  resumir,
  opciones,
  filtro,
  ...resto
}: {
  resumir: () => ResumenMetricas
  opciones: () => { empresas: Opcion[]; flotas: Opcion[] }
  conexion: EstadoConexion
  error: string | null
  simulacion: EstadoSimulacion | null
  ocupado: boolean
  onAlternarSimulacion: () => void
  filtro: Filtro
  onCambiarFiltro: (filtro: Filtro) => void
}) {
  const [resumen, setResumen] = useState<ResumenMetricas>({
    total: 0,
    mostrados: 0,
    lotesPorSegundo: 0,
    edadUltimoDatoMs: null,
    latenciaP95Ms: null,
  })
  const [listas, setListas] = useState<{ empresas: Opcion[]; flotas: Opcion[] }>({ empresas: [], flotas: [] })

  useEffect(() => {
    const refrescar = () => {
      setResumen(resumir())
      setListas(opciones())
    }
    refrescar()
    const id = setInterval(refrescar, 1_000)
    return () => clearInterval(id)
  }, [resumir, opciones, filtro])

  return <AutosStats metricas={resumen} empresas={listas.empresas} flotas={listas.flotas} filtro={filtro} {...resto} />
}
