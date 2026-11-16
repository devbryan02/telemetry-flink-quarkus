"use client"

import { useCallback, useEffect, useReducer, useRef } from "react"

import { listarViajes, obtenerResumenes } from "../api"
import { agruparPorCarrera } from "../carreras"
import { crearEstado, reducirCarreras, type ModoCarga } from "../estado-carreras"
import { rangoDelDia } from "../presentacion"

const REFRESCO_EN_CURSO_MS = 5_000

/** Cancela solicitudes anteriores y aplica resultados solo a la fecha y página vigentes. */
export function useCarreras(fecha: Date) {
  const dia = fecha.toDateString()
  const [datos, enviar] = useReducer(reducirCarreras, dia, crearEstado)
  const pendiente = useRef<AbortController | null>(null)
  const secuencia = useRef(0)
  if (datos.dia !== dia) enviar({ tipo: "dia", dia })

  const pedir = useCallback(async (modo: ModoCarga, cursor: string | null) => {
    // Un refresco periódico nunca interrumpe una carga inicial ni una ampliación.
    if (modo === "refresco" && pendiente.current && !pendiente.current.signal.aborted) return
    pendiente.current?.abort()
    const control = new AbortController()
    pendiente.current = control
    const solicitud = ++secuencia.current
    enviar({ tipo: "iniciar", dia, solicitud, modo })
    try {
      const rango = rangoDelDia(new Date(dia))
      const pagina = await listarViajes({ ...rango, cursor: cursor ?? undefined }, control.signal)
      const resumenes = await obtenerResumenes(pagina.items.map(v => v.viajeId), control.signal)
      if (!control.signal.aborted) enviar({ tipo: "recibir", dia, solicitud, modo, pagina, resumenes })
    } catch (e) {
      if (!control.signal.aborted) enviar({ tipo: "error", dia, solicitud, mensaje: e instanceof Error ? e.message : "Error desconocido" })
    } finally {
      if (pendiente.current === control) pendiente.current = null
    }
  }, [dia])

  useEffect(() => {
    void pedir("inicial", null)
    return () => pendiente.current?.abort()
  }, [pedir])

  const carreras = agruparPorCarrera(datos.viajes, datos.resumenes)
  const enCurso = datos.paginas === 1 && carreras.some(c => c.estado === "EN_CURSO")
  useEffect(() => {
    if (!enCurso) return
    const id = setInterval(() => void pedir("refresco", null), REFRESCO_EN_CURSO_MS)
    return () => clearInterval(id)
  }, [enCurso, pedir])

  const cargarMas = useCallback(async () => {
    if (datos.cursor && !datos.cargando) await pedir("mas", datos.cursor)
  }, [datos.cursor, datos.cargando, pedir])

  return { carreras, cargando: datos.cargando, error: datos.error, hayMas: datos.cursor !== null, cargarMas }
}
