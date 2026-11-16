"use client"

import { CheckmarkFilled, ErrorFilled, Launch } from "@carbon/icons-react"
import { InlineNotification, Tag } from "@carbon/react"
import { useEffect, useRef, useState } from "react"

import { Encabezado } from "@/components/encabezado"

import { obtenerMetricas, obtenerSalud } from "../api"
import { type MuestraProm, tasaPorSegundo, valor, valorMaximo } from "../prometheus"
import { filasSalud, type Salud } from "../salud"

const REFRESCO_MS = 5_000
const API = process.env.NEXT_PUBLIC_API_URL ?? ""
const FLINK_UI = process.env.NEXT_PUBLIC_FLINK_UI_URL ?? "http://localhost:8081"
const CANALES = ["ultima-posicion", "historial-telemetria"] as const
const LAG = "kafka_consumer_fetch_manager_records_lag_max"
const FLUJO = [
  ["Productor", "Simulación", "timer Vert.x 1 s"],
  ["Topic", "telemetria", "12 part. · key=carId"],
  ["Job", "Flink 2.2.1", "keyBy(carId) · ValueState"],
  ["Topic", "ultima-posicion", "compact"],
  ["Consumidor", "Autos", "tb_ultima_posicion"],
  ["Salida", "WebSocket", "/ws/autos · 500 ms"],
] as const
const num = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 1 })
const fmt = (n: number | null) => (n === null ? "—" : num.format(n))

/** Salud, flujo y métricas de la API (runbook: docs/test-cases/persistencia-posiciones-viajes.md). */
export function OperacionPantalla() {
  const [salud, setSalud] = useState<Salud | null>(null)
  const [metricas, setMetricas] = useState<MuestraProm[]>([])
  const [eventosPorSeg, setEventosPorSeg] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const anterior = useRef<{ valor: number | null; ms: number } | null>(null)

  useEffect(() => {
    let vigente = true
    const leer = async () => {
      try {
        const [s, m] = await Promise.all([obtenerSalud(), obtenerMetricas()])
        if (!vigente) return
        const ahora = Date.now()
        const insertados = valor(m, "viajes_eventos_insertados_total")
        setEventosPorSeg(anterior.current ? tasaPorSegundo(anterior.current.valor, insertados, ahora - anterior.current.ms) : null)
        anterior.current = { valor: insertados, ms: ahora }
        setSalud(s)
        setMetricas(m)
        setError(null)
      } catch (e) {
        if (vigente) setError(e instanceof Error ? e.message : "Error desconocido")
      }
    }
    void leer()
    const id = setInterval(leer, REFRESCO_MS)
    return () => {
      vigente = false
      clearInterval(id)
    }
  }, [])

  const fallos = [valor(metricas, "viajes_persistencia_fallos_total"), valor(metricas, "autos_persistencia_fallos_total")]
  const indicadores = [
    ["Eventos por segundo", fmt(eventosPorSeg)],
    ["Viajes sin cierre", fmt(valor(metricas, "viajes_sin_cierre"))],
    ["Duplicados ignorados", fmt(valor(metricas, "viajes_eventos_duplicados_total"))],
    ["Eventos inválidos", fmt(valor(metricas, "viajes_eventos_invalidos_total"))],
    ["Lotes revertidos", fallos.every((f) => f === null) ? "—" : fmt(fallos.reduce<number>((a, f) => a + (f ?? 0), 0))],
  ] as const

  return (
    <>
      <Encabezado />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-[1312px] flex-col gap-8 px-6 pt-8 pb-12">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h1 className="text-[28px] leading-9 font-normal">Operación</h1>
              <p className="text-muted-foreground">Salud de la API, del job de Flink y de los consumidores que guardan en PostgreSQL.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a href={`${API}/q/health/ready`} target="_blank" rel="noreferrer" className="flex h-10 items-center rounded-full border border-input px-4 font-mono text-xs text-foreground no-underline">/q/health/ready</a>
              <a href={`${API}/q/metrics`} target="_blank" rel="noreferrer" className="flex h-10 items-center rounded-full border border-input px-4 font-mono text-xs text-foreground no-underline">/q/metrics</a>
              <a href={FLINK_UI} target="_blank" rel="noreferrer" className="flex h-10 items-center gap-2 rounded-full bg-primary px-5 text-primary-foreground no-underline">
                Abrir Flink UI <Launch size={16} />
              </a>
            </div>
          </div>

          <InlineNotification kind="info" lowContrast hideCloseButton title="Si un consumidor JDBC falla," subtitle="su canal se detiene y la readiness pasa a DOWN. Se recupera reiniciando la API: el eventId hace idempotente la reentrega." />
          {error && <InlineNotification kind="error" lowContrast hideCloseButton title="No se pudo leer la API" subtitle={error} />}

          <section aria-labelledby="t-salud" className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <h2 id="t-salud" className="text-xl font-normal">Salud</h2>
              {salud && <Tag type={salud.status === "UP" ? "green" : "red"} size="sm">Readiness {salud.status}</Tag>}
            </div>
            {salud?.error && <p className="text-error-text">{salud.error}</p>}
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
              {(salud ? filasSalud(salud) : []).map((f) => (
                <li key={f.nombre} className="flex flex-col gap-2 rounded-lg border bg-card p-4">
                  <span className="text-xs text-muted-foreground">{f.nombre}</span>
                  <span className="flex items-center gap-2 text-xl">
                    {f.ok ? <CheckmarkFilled size={20} className="fill-success" /> : <ErrorFilled size={20} className="fill-destructive" />}
                    {f.ok ? "UP" : "DOWN"}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">{f.detalle}</span>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="t-flujo" className="flex flex-col gap-4">
            <h2 id="t-flujo" className="text-xl font-normal">Flujo de eventos</h2>
            <div className="overflow-x-auto rounded-lg border bg-muted p-6">
              <ol aria-label="Camino de la última posición" className="flex min-w-[980px] items-stretch gap-2">
                {FLUJO.map(([tipo, nombre, detalle], i) => (
                  <li key={nombre} className="flex flex-1 items-center gap-2">
                    <div className="flex min-h-[92px] flex-1 flex-col gap-1.5 rounded-lg border bg-card p-3">
                      <Tag size="sm" type="gray" className="self-start">{tipo}</Tag>
                      <span className="font-semibold">{nombre}</span>
                      <span className="font-mono text-xs text-muted-foreground">{detalle}</span>
                    </div>
                    {i < FLUJO.length - 1 && <span aria-hidden className="text-muted-foreground">→</span>}
                  </li>
                ))}
              </ol>
              <p className="mt-4 text-xs text-muted-foreground">
                El consumidor de <strong>Viajes</strong> lee <code>telemetria</code> directamente y guarda en <code>tb_viaje</code> y <code>tb_posicion_historial</code>, incluidas las muestras atrasadas que Flink descarta.
              </p>
            </div>
          </section>

          <section aria-labelledby="t-metricas" className="flex flex-col gap-4">
            <h2 id="t-metricas" className="text-xl font-normal">Métricas</h2>
            <dl className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
              {indicadores.map(([dt, dd]) => (
                <div key={dt} className="flex flex-col gap-1 rounded-lg border bg-card p-4">
                  <dt className="text-xs text-muted-foreground">{dt}</dt>
                  <dd className="font-mono text-[28px] leading-9">{dd}</dd>
                </div>
              ))}
            </dl>
            <div className="overflow-x-auto rounded-lg border bg-card">
              <table className="w-full min-w-[560px] border-collapse">
                <thead>
                  <tr className="h-10 bg-muted text-left text-xs text-muted-foreground">
                    <th scope="col" className="px-4 font-semibold">Canal</th>
                    <th scope="col" className="px-4 text-right font-semibold">Lag máximo</th>
                  </tr>
                </thead>
                <tbody>
                  {CANALES.map((c) => (
                    <tr key={c} className="h-12 border-t">
                      <td className="px-4 font-mono text-sm">{c}</td>
                      <td className="px-4 text-right font-mono text-sm">{fmt(valorMaximo(metricas, LAG, { client_id: `kafka-consumer-${c}` }))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </>
  )
}
