"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { listarPosiciones, listarViajes, obtenerViaje } from "../api"
import { estadoEn, huecos, prepararRecorrido, type Recorrido, velocidades } from "../repeticion"
import type { ViajeDetalle, ViajeVista } from "../types"

/** El simulador manda una muestra por segundo: más de 1,5 s entre dos muestras es un hueco. */
export const UMBRAL_HUECO_MS = 1_500
export const VELOCIDADES_REPRODUCCION = [1, 4, 16] as const

/** Carga el viaje, sus muestras y los de su carrera; maneja el instante de la repetición. */
export function useRepeticion(viajeId: string) {
  const [detalle, setDetalle] = useState<ViajeDetalle | null>(null)
  const [recorrido, setRecorrido] = useState<Recorrido>({ muestras: [], acumuladoM: [] })
  const [hermanos, setHermanos] = useState<ViajeVista[]>([])
  const [error, setError] = useState<string | null>(null)
  const [ts, setTs] = useState(0)
  const [reproduciendo, setReproduciendo] = useState(false)
  const [factor, setFactor] = useState<(typeof VELOCIDADES_REPRODUCCION)[number]>(4)

  useEffect(() => {
    const control = new AbortController()
    Promise.all([obtenerViaje(viajeId, control.signal), listarPosiciones(viajeId, control.signal)])
      .then(async ([d, posiciones]) => {
        if (control.signal.aborted) return
        const r = prepararRecorrido(posiciones)
        setDetalle(d)
        setRecorrido(r)
        setTs(r.muestras[0]?.ts ?? 0)
        if (d.viaje.carreraId) {
          const pagina = await listarViajes({ carreraId: d.viaje.carreraId }, control.signal)
          if (control.signal.aborted) return
          setHermanos(pagina.items.filter((v) => v.estado !== "REEMPLAZADO"))
        }
      })
      .catch((e: unknown) => {
        if (control.signal.aborted) return
        const status = (e as { response?: { status?: number } }).response?.status
        setError(status === 404 ? "El viaje no existe." : e instanceof Error ? e.message : "Error desconocido")
      })
    return () => control.abort()
  }, [viajeId])

  const inicio = recorrido.muestras[0]?.ts ?? 0
  const fin = recorrido.muestras.at(-1)?.ts ?? 0

  // avance en tiempo real multiplicado por el factor; se detiene al llegar al final
  const ultimoCuadro = useRef<number | null>(null)
  useEffect(() => {
    if (!reproduciendo) return
    let id = 0
    const paso = (ahora: number) => {
      const dt = ultimoCuadro.current === null ? 0 : ahora - ultimoCuadro.current
      ultimoCuadro.current = ahora
      setTs((t) => {
        const siguiente = Math.min(fin, t + dt * factor)
        if (siguiente >= fin) setReproduciendo(false)
        return siguiente
      })
      id = requestAnimationFrame(paso)
    }
    id = requestAnimationFrame(paso)
    return () => {
      cancelAnimationFrame(id)
      ultimoCuadro.current = null
    }
  }, [reproduciendo, factor, fin])

  const saltar = useCallback((ms: number) => setTs((t) => Math.max(inicio, Math.min(fin, t + ms))), [inicio, fin])
  const alternar = useCallback(() => {
    if (!reproduciendo && ts >= fin) setTs(inicio) // play al final vuelve a empezar
    setReproduciendo((r) => !r)
  }, [reproduciendo, ts, inicio, fin])

  const puntos = useMemo(() => velocidades(recorrido), [recorrido])
  const listaHuecos = useMemo(() => huecos(recorrido, UMBRAL_HUECO_MS), [recorrido])

  return {
    detalle, recorrido, hermanos, error, inicio, fin, ts, setTs, reproduciendo, alternar, saltar, factor, setFactor,
    instante: estadoEn(recorrido, ts), puntos, huecos: listaHuecos,
  }
}
