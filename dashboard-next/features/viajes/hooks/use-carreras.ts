"use client"

import { useCallback, useEffect, useState } from "react"

import { listarViajes, obtenerResumenes } from "../api"
import { agruparPorCarrera, type Carrera } from "../carreras"
import { rangoDelDia } from "../presentacion"
import type { ResumenViaje, ViajeVista } from "../types"

const REFRESCO_EN_CURSO_MS = 5_000

type Estado = { carreras: Carrera[]; cargando: boolean; error: string | null; hayMas: boolean }

/** Viajes del día agrupados por carrera; refresca mientras hay una carrera en curso y solo hay una página. */
export function useCarreras(fecha: Date) {
  const [viajes, setViajes] = useState<ViajeVista[]>([])
  const [resumenes, setResumenes] = useState(new Map<string, ResumenViaje>())
  const [cursor, setCursor] = useState<string | null>(null)
  const [paginas, setPaginas] = useState(0)
  const [estado, setEstado] = useState<Omit<Estado, "carreras" | "hayMas">>({ cargando: true, error: null })
  const dia = fecha.toDateString()
  const [diaGuardado, setDiaGuardado] = useState(dia)
  // Al cambiar de día se descartan los datos anteriores antes de pintarlos.
  if (diaGuardado !== dia) {
    setDiaGuardado(dia)
    setViajes([])
    setResumenes(new Map())
    setCursor(null)
    setPaginas(0)
    setEstado({ cargando: true, error: null })
  }

  const cargar = useCallback(
    async (desdeCursor: string | null, signal?: AbortSignal) => {
      const { desde, hasta } = rangoDelDia(new Date(dia))
      const pagina = await listarViajes({ desde, hasta, cursor: desdeCursor ?? undefined }, signal)
      const nuevos = await obtenerResumenes(pagina.items.map((v) => v.viajeId), signal)
      return { pagina, nuevos }
    },
    [dia],
  )

  // primera página al cambiar de día
  useEffect(() => {
    const control = new AbortController()
    cargar(null, control.signal)
      .then(({ pagina, nuevos }) => {
        if (control.signal.aborted) return
        setViajes(pagina.items)
        setResumenes(nuevos)
        setCursor(pagina.nextCursor)
        setPaginas(1)
        setEstado({ cargando: false, error: null })
      })
      .catch((e: unknown) => {
        if (!control.signal.aborted) setEstado({ cargando: false, error: e instanceof Error ? e.message : "Error desconocido" })
      })
    return () => control.abort()
  }, [cargar])

  const carreras = agruparPorCarrera(viajes, resumenes)
  const enCurso = paginas === 1 && carreras.some((c) => c.estado === "EN_CURSO")

  // con una carrera en curso, la primera página se vuelve a pedir cada 5 s
  useEffect(() => {
    if (!enCurso) return
    const id = setInterval(() => {
      cargar(null)
        .then(({ pagina, nuevos }) => {
          setViajes(pagina.items)
          setResumenes(nuevos)
          setCursor(pagina.nextCursor)
        })
        .catch(() => undefined)
    }, REFRESCO_EN_CURSO_MS)
    return () => clearInterval(id)
  }, [enCurso, cargar])

  const cargarMas = useCallback(async () => {
    if (!cursor) return
    setEstado((e) => ({ ...e, cargando: true }))
    try {
      const { pagina, nuevos } = await cargar(cursor)
      setViajes((vs) => [...vs, ...pagina.items])
      setResumenes((r) => new Map([...r, ...nuevos]))
      setCursor(pagina.nextCursor)
      setPaginas((n) => n + 1)
      setEstado({ cargando: false, error: null })
    } catch (e) {
      setEstado({ cargando: false, error: e instanceof Error ? e.message : "Error desconocido" })
    }
  }, [cursor, cargar])

  return { carreras, ...estado, hayMas: cursor !== null, cargarMas }
}
