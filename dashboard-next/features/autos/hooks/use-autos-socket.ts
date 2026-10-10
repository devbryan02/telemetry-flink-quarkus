"use client"

import { useEffect, useRef, useState } from "react"

import type { Auto } from "../types"

export type EstadoConexion = "conectando" | "abierta" | "reconectando"

const ESPERA_INICIAL_MS = 1_000
const ESPERA_MAXIMA_MS = 10_000

/**
 * Se suscribe a `WS /ws/autos` (WebSocket nativo) y entrega cada lote al callback.
 * Reconecta con backoff exponencial si la conexión se cae (spec §10, RF-U3).
 */
export function useAutosSocket(url: string | undefined, alRecibirLote: (lote: Auto[]) => void): EstadoConexion {
  const [estado, setEstado] = useState<EstadoConexion>("conectando")
  // El callback cambia en cada render; se guarda en un ref para no reconectar por eso
  const callback = useRef(alRecibirLote)
  useEffect(() => {
    callback.current = alRecibirLote
  }, [alRecibirLote])

  useEffect(() => {
    if (!url) return
    let ws: WebSocket | null = null
    let temporizador: ReturnType<typeof setTimeout> | undefined
    let espera = ESPERA_INICIAL_MS
    let cerrado = false

    const conectar = () => {
      ws = new WebSocket(url)
      ws.onopen = () => {
        espera = ESPERA_INICIAL_MS
        setEstado("abierta")
      }
      ws.onmessage = (evento) => {
        try {
          callback.current(JSON.parse(evento.data as string) as Auto[])
        } catch {
          // un mensaje malformado no debe tumbar la conexión
        }
      }
      ws.onclose = () => {
        if (cerrado) return
        setEstado("reconectando")
        temporizador = setTimeout(conectar, espera)
        espera = Math.min(espera * 2, ESPERA_MAXIMA_MS)
      }
    }

    conectar()
    return () => {
      cerrado = true
      clearTimeout(temporizador)
      ws?.close()
    }
  }, [url])

  return estado
}
