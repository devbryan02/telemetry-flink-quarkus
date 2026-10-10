"use client"

import type { FeatureCollection, LineString } from "geojson"
import type { LngLatBoundsLike } from "maplibre-gl"
import { useCallback, useEffect, useRef, useState } from "react"

import { Map, type MapRef } from "@/components/ui/map"

import { Animador } from "../animacion"
import {
  cambiarVelocidad,
  detenerCarrera,
  iniciarCarrera,
  listarRutas,
  obtenerAutos,
  obtenerRuta,
  obtenerSimulacion,
} from "../api"
import { cumpleFiltro, empresasDisponibles, type Filtro, flotasDisponibles, type Opcion, SIN_FILTRO } from "../filtros"
import { aGeoJSON } from "../geojson"
import { useAutosSocket, type EstadoConexion } from "../hooks/use-autos-socket"
import { Metricas } from "../metricas"
import type { Auto, EstadoSimulacion, ResumenRuta } from "../types"
import { AutosLayer, type AutosLayerHandle } from "./autos-layer"
import { CarreraPanel, type ResumenMetricas } from "./carrera-panel"
import { RutaLayer } from "./ruta-layer"
import { SalidaMeta } from "./salida-meta"

const LIMA: [number, number] = [-77.03, -12.06]
const WS_URL = process.env.NEXT_PUBLIC_WS_URL
/** Durante la carrera el estado se consulta cada segundo; el resto del tiempo, cada 5 s. */
const SONDEO_EN_CURSO_MS = 1_000
const SONDEO_EN_REPOSO_MS = 5_000

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

/** Mapa de la carrera: ruta elegida, autos en vivo filtrables por empresa y flota (spec §10). */
export default function AutosMap() {
  const mapa = useRef<MapRef>(null)
  const capa = useRef<AutosLayerHandle>(null)
  // El estado de los autos vive fuera de React; el Animador interpola su movimiento entre eventos
  const autos = useRef(new globalThis.Map<string, Auto>())
  const animador = useRef(new Animador())
  const metricas = useRef(new Metricas())
  const cuadro = useRef<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [rutas, setRutas] = useState<ResumenRuta[]>([])
  const [rutaSeleccionada, setRutaSeleccionada] = useState<string | null>(null)
  const [geometria, setGeometria] = useState<FeatureCollection<LineString> | null>(null)
  const [filtro, setFiltro] = useState<Filtro>(SIN_FILTRO)
  const filtroActual = useRef(filtro)
  const [simulacion, setSimulacion] = useState<EstadoSimulacion | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [seguirLider, setSeguirLider] = useState(false)

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

  // Carga inicial: autos, rutas y estado de la carrera (que define la ruta seleccionada al entrar)
  useEffect(() => {
    const control = new AbortController()
    obtenerAutos(control.signal)
      .then(fusionar)
      .catch((e: unknown) => {
        if (!control.signal.aborted) setError(`No se pudo cargar la flota: ${mensaje(e)}`)
      })
    Promise.all([listarRutas(control.signal), obtenerSimulacion()])
      .then(([lista, estado]) => {
        setRutas(lista)
        setSimulacion(estado)
        setRutaSeleccionada((actual) => actual ?? estado.ruta ?? lista[0]?.id ?? null)
      })
      .catch((e: unknown) => {
        if (!control.signal.aborted) setError(`No se pudieron cargar las rutas: ${mensaje(e)}`)
      })
    return () => {
      control.abort()
      if (cuadro.current !== null) cancelAnimationFrame(cuadro.current)
    }
  }, [fusionar])

  // Geometría de la ruta elegida: se dibuja y se encuadra aunque no haya carrera
  useEffect(() => {
    if (!rutaSeleccionada) return
    const control = new AbortController()
    obtenerRuta(rutaSeleccionada, control.signal)
      .then((g) => {
        setGeometria(g)
        mapa.current?.fitBounds(limitesDe(g), { padding: { top: 60, bottom: 60, left: 360, right: 60 }, duration: 600 })
      })
      .catch((e: unknown) => {
        if (!control.signal.aborted) setError(`No se pudo cargar la ruta: ${mensaje(e)}`)
      })
    return () => control.abort()
  }, [rutaSeleccionada])

  // Estado de la carrera: cada 1 s mientras corre, cada 5 s en reposo
  const enCurso = simulacion?.estado === "EN_CURSO"
  useEffect(() => {
    const id = setInterval(
      () =>
        obtenerSimulacion()
          .then(setSimulacion)
          .catch(() => undefined),
      enCurso ? SONDEO_EN_CURSO_MS : SONDEO_EN_REPOSO_MS,
    )
    return () => clearInterval(id)
  }, [enCurso])

  // Seguir al líder: centra el mapa en el primero de la clasificación
  const lider = simulacion?.estado === "EN_CURSO" ? simulacion.autos[0]?.carId : undefined
  useEffect(() => {
    if (!seguirLider || !lider) return
    const id = setInterval(() => {
      const p = animador.current.posicionDe(lider, performance.now())
      if (p) mapa.current?.easeTo({ center: [p.lon, p.lat], duration: 900 })
    }, 1_000)
    return () => clearInterval(id)
  }, [seguirLider, lider])

  const ejecutar = useCallback(async (accion: () => Promise<EstadoSimulacion>, que: string) => {
    setOcupado(true)
    try {
      setSimulacion(await accion())
      setError(null)
    } catch (e) {
      setError(`No se pudo ${que}: ${mensaje(e)}`)
    } finally {
      setOcupado(false)
    }
  }, [])

  const iniciar = useCallback(() => {
    if (rutaSeleccionada) void ejecutar(() => iniciarCarrera(rutaSeleccionada), "iniciar la carrera")
  }, [ejecutar, rutaSeleccionada])

  const detener = useCallback(() => void ejecutar(detenerCarrera, "detener la carrera"), [ejecutar])

  const velocidad = useCallback(
    (carId: string, kmh: number) => void ejecutar(() => cambiarVelocidad(carId, kmh), "cambiar la velocidad"),
    [ejecutar],
  )

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
      <Map ref={mapa} center={LIMA} zoom={11}>
        <RutaLayer ruta={geometria} />
        <SalidaMeta ruta={geometria} />
        <AutosLayer ref={capa} filtro={filtro} />
      </Map>
      <div className="absolute top-3 left-3 z-10">
        <PanelVivo
          resumir={resumir}
          opciones={opciones}
          filtro={filtro}
          rutas={rutas}
          rutaSeleccionada={rutaSeleccionada}
          onElegirRuta={setRutaSeleccionada}
          simulacion={simulacion}
          ocupado={ocupado}
          onIniciar={iniciar}
          onDetener={detener}
          onVelocidad={velocidad}
          seguirLider={seguirLider}
          onSeguirLider={setSeguirLider}
          onCambiarFiltro={cambiarFiltro}
          conexion={conexion}
          error={error}
        />
      </div>
    </div>
  )
}

type PropsPanel = Omit<Parameters<typeof CarreraPanel>[0], "metricas" | "empresas" | "flotas"> & {
  resumir: () => ResumenMetricas
  opciones: () => { empresas: Opcion[]; flotas: Opcion[] }
  conexion: EstadoConexion
}

/** Refresca métricas y opciones del filtro una vez por segundo sin rerenderizar el mapa. */
function PanelVivo({ resumir, opciones, ...resto }: PropsPanel) {
  const [metricas, setMetricas] = useState<ResumenMetricas>({
    total: 0,
    mostrados: 0,
    edadUltimoDatoMs: null,
    latenciaP95Ms: null,
  })
  const [listas, setListas] = useState<{ empresas: Opcion[]; flotas: Opcion[] }>({ empresas: [], flotas: [] })

  useEffect(() => {
    const refrescar = () => {
      setMetricas(resumir())
      setListas(opciones())
    }
    refrescar()
    const id = setInterval(refrescar, 1_000)
    return () => clearInterval(id)
  }, [resumir, opciones, resto.filtro])

  return <CarreraPanel metricas={metricas} empresas={listas.empresas} flotas={listas.flotas} {...resto} />
}
