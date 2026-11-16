import { Tag } from "@carbon/react"
import { PlayFilledAlt } from "@carbon/icons-react"
import Link from "next/link"

import { varColor } from "@/features/autos"

import type { Carrera, EstadoCarrera } from "../carreras"
import { textoResultado } from "../presentacion"

const ESTADO: Record<EstadoCarrera, { texto: string; tipo: "blue" | "green" | "gray" }> = {
  EN_CURSO: { texto: "En curso", tipo: "blue" },
  TERMINADA: { texto: "Terminada", tipo: "green" },
  DETENIDA: { texto: "Detenida", tipo: "gray" },
}
const hora = new Intl.DateTimeFormat("es-PE", { hour: "2-digit", minute: "2-digit" })
const kmh = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 0 })

/** Una carrera: mini mapa, estado y clasificación; cada auto lleva a su repetición. */
export function TarjetaCarrera({
  carrera,
  nombreRuta,
  longitudKm,
  trazo,
}: {
  carrera: Carrera
  nombreRuta: string
  longitudKm: number | null
  trazo: string
}) {
  const estado = ESTADO[carrera.estado]
  const ganador = carrera.participantes[0]
  return (
    <li className="flex flex-wrap gap-5 rounded-lg border bg-card p-4">
      <svg role="img" aria-label={`Ruta ${nombreRuta}`} viewBox="0 0 200 120" className="h-[120px] w-[200px] shrink-0 rounded-lg bg-muted">
        {trazo && <path d={trazo} fill="none" stroke="var(--cds-text-primary)" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />}
      </svg>
      <div className="flex min-w-0 flex-[1_1_480px] flex-col gap-2.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h2 className="text-base font-semibold">{nombreRuta}</h2>
          <Tag type={estado.tipo} size="sm">
            {estado.texto}
          </Tag>
          <span className="text-xs text-muted-foreground">
            {hora.format(carrera.inicioTs)}
            {longitudKm !== null && ` · ${longitudKm} km`}
          </span>
          {ganador && (
            <Link
              href={`/viajes/${ganador.viajeId}`}
              className="ml-auto flex h-8 items-center gap-1.5 rounded-full border border-foreground px-3.5 text-[13px] text-foreground no-underline"
            >
              Ver repetición
              <PlayFilledAlt size={14} />
            </Link>
          )}
        </div>
        <ol className="flex flex-col gap-0.5">
          {carrera.participantes.map((p) => {
            const { valor, diferencia } = textoResultado(p)
            const avance =
              p.estado === "FINALIZADO" ? 100 : longitudKm && p.distanciaM !== null ? Math.min(100, p.distanciaM / (longitudKm * 10)) : 0
            return (
              <li key={p.viajeId}>
                <Link
                  href={`/viajes/${p.viajeId}`}
                  title={`Ver el viaje de ${p.carId}`}
                  className="grid min-h-10 grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 rounded-md px-2 py-2 text-foreground no-underline hover:bg-muted min-[900px]:grid-cols-[28px_minmax(120px,1.2fr)_minmax(80px,2fr)_88px_80px_72px]"
                >
                  <span className="flex size-6 items-center justify-center rounded-full bg-muted font-mono text-xs">{p.posicion}</span>
                  <span className="flex min-w-0 items-center gap-2">
                    <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: varColor(p.carId) }} />
                    <strong className="font-semibold">{p.carId}</strong>
                  </span>
                  <span role="progressbar" aria-label={`Avance de ${p.carId}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(avance)} className="col-span-3 row-start-3 h-1 overflow-hidden rounded-full bg-border min-[900px]:col-span-1 min-[900px]:row-auto">
                    <span className="block h-full rounded-full" style={{ width: `${avance}%`, background: varColor(p.carId) }} />
                  </span>
                  <span className="text-right font-mono">{valor}</span>
                  <span aria-label="Diferencia" className="col-span-2 text-right font-mono text-xs text-muted-foreground min-[900px]:col-span-1">{diferencia}</span>
                  <span aria-label="Velocidad media" className="text-right font-mono text-xs text-muted-foreground">
                    {p.velocidadMediaKmh === null ? "—" : `${kmh.format(p.velocidadMediaKmh)} km/h`}
                  </span>
                </Link>
              </li>
            )
          })}
        </ol>
      </div>
    </li>
  )
}
