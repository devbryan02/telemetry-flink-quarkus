"use client"

import { InlineLoading, InlineNotification, Tag } from "@carbon/react"
import { ArrowLeft } from "@carbon/icons-react"
import Link from "next/link"
import { useParams } from "next/navigation"

import { Encabezado } from "@/components/encabezado"
import { Map } from "@/components/ui/map"
import { useEstilosMapa, varColor } from "@/features/autos"

import { useRepeticion } from "../hooks/use-repeticion"
import { duracion } from "../presentacion"
import { GraficoVelocidad } from "./grafico-velocidad"
import { RecorridoLayer } from "./recorrido-layer"
import { Reproductor } from "./reproductor"

const LIMA: [number, number] = [-77.03, -12.06]
const ESTADO = { FINALIZADO: ["Finalizado", "green"], DETENIDO: ["Detenido", "gray"], SIN_CIERRE: ["Sin cierre", "blue"], REEMPLAZADO: ["Reemplazado", "gray"] } as const
const km2 = new Intl.NumberFormat("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const ent = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 1 })

/** "var(--auto-2)" → "--auto-2": MapLibre y el gráfico leen el token por nombre. */
const tokenDe = (carId: string) => varColor(carId).slice(4, -1)

export function RepeticionPantalla() {
  const { viajeId } = useParams<{ viajeId: string }>()
  return <RepeticionViaje key={viajeId} viajeId={viajeId} />
}

/** Cada viaje monta su propio reproductor, mapa y solicitudes pendientes. */
function RepeticionViaje({ viajeId }: { viajeId: string }) {
  const estilos = useEstilosMapa()
  const r = useRepeticion(viajeId)
  const v = r.detalle?.viaje
  const res = r.detalle?.resumen

  return (
    <>
      <Encabezado />
      <div className="flex min-h-0 flex-1 flex-wrap items-start gap-4 overflow-y-auto p-4">
        <nav aria-label="Viajes de la carrera" className="flex w-full flex-col gap-2 rounded-lg border bg-card p-2 sm:w-[280px]">
          <Link href="/viajes" className="flex items-center gap-1 px-2 py-1 text-[13px] no-underline">
            <ArrowLeft size={14} /> Viajes
          </Link>
          <ul className="flex flex-col gap-0.5">
            {r.hermanos.map((h) => (
              <li key={h.viajeId}>
                <Link
                  href={`/viajes/${h.viajeId}`}
                  aria-current={h.viajeId === viajeId ? "page" : undefined}
                  className={`flex h-9 items-center gap-2 rounded-md px-2 text-foreground no-underline ${h.viajeId === viajeId ? "bg-secondary font-semibold" : "hover:bg-muted"}`}
                >
                  <span aria-hidden className="size-2.5 rounded-full" style={{ background: varColor(h.carId) }} />
                  <span className="flex-1">{h.carId}</span>
                  <span className="text-xs text-muted-foreground">{ESTADO[h.estado][0]}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <main className="flex min-w-0 flex-[999_1_640px] flex-col gap-3">
          {r.error && <InlineNotification kind="error" lowContrast hideCloseButton title="No se pudo cargar el viaje" subtitle={r.error} />}
          {!r.error && !r.detalle && <InlineLoading description="Cargando el viaje…" />}
          {v && res && (
            <>
              <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card px-3 py-2">
                <span aria-hidden className="size-3 rounded-full" style={{ background: varColor(v.carId) }} />
                <h1 className="text-base font-semibold">
                  {v.carId} · {v.rutaId}
                </h1>
                <Tag type={ESTADO[v.estado][1]} size="sm">
                  {ESTADO[v.estado][0]}
                </Tag>
                <dl className="ml-auto flex flex-wrap gap-1.5">
                  {[
                    ["Duración", res.duracionViajeMs === null ? "—" : duracion(res.duracionViajeMs)],
                    ["Distancia", `${km2.format(res.distanciaObservadaM / 1000)} km`],
                    ["Vel. media", res.velocidadMediaObservadaKmh === null ? "—" : `${ent.format(res.velocidadMediaObservadaKmh)} km/h`],
                    ["Muestras", String(res.cantidadMuestras)],
                    ["Máx. entre muestras", `${ent.format(res.maxIntervaloMuestrasMs / 1000)} s`],
                  ].map(([dt, dd]) => (
                    <div key={dt} className="flex h-7 items-center gap-1.5 rounded-full bg-muted px-2.5">
                      <dt className="text-xs text-muted-foreground">{dt}</dt>
                      <dd className="font-mono text-xs">{dd}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div className="relative h-[440px] overflow-hidden rounded-lg border">
                <Map center={LIMA} zoom={11} styles={estilos}>
                  <RecorridoLayer recorrido={r.recorrido} huecos={r.huecos} instante={r.instante} tokenColor={tokenDe(v.carId)} />
                </Map>
              </div>
              <section aria-label="Reproducción" className="flex flex-col gap-3 rounded-lg border bg-card px-4 py-3">
                <Reproductor
                  inicio={r.inicio}
                  fin={r.fin}
                  ts={r.ts}
                  instante={r.instante}
                  reproduciendo={r.reproduciendo}
                  factor={r.factor}
                  onAlternar={r.alternar}
                  onSaltar={r.saltar}
                  onPosicion={r.setTs}
                  onFactor={r.setFactor}
                />
                <GraficoVelocidad puntos={r.puntos} huecos={r.huecos} inicio={r.inicio} fin={r.fin} ts={r.ts} tokenColor={tokenDe(v.carId)} />
              </section>
            </>
          )}
        </main>
      </div>
    </>
  )
}
