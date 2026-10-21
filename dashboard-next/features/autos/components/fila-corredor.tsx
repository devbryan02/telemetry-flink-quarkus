"use client"

import { Flag } from "lucide-react"
import { useState } from "react"

import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"

import { nombreEmpresa, nombreFlota } from "../filtros"
import { cronometro, km } from "../formato"
import { varColor } from "../paleta"
import type { Clasificado } from "../types"

export const VELOCIDAD_MIN = 10
export const VELOCIDAD_MAX = 500

/** Fila de la clasificación: posición, color del auto, progreso, llegada y slider de velocidad. */
export function FilaCorredor({
  auto,
  longitudM,
  onVelocidad,
}: {
  auto: Clasificado
  longitudM: number
  onVelocidad: (carId: string, kmh: number) => void
}) {
  // mientras se arrastra se muestra el borrador; al soltar se envía y vuelve a mandar el valor del servidor
  const [borrador, setBorrador] = useState<number | null>(null)
  const kmh = borrador ?? auto.velocidadKmh

  const progreso = longitudM > 0 ? Math.min(100, (auto.recorridoM / longitudM) * 100) : 0
  const llego = auto.llegadaMs !== null

  return (
    <li className="flex flex-col gap-2 border-t px-4 py-3" data-auto={auto.carId}>
      <div className="flex items-center gap-3">
        <span className="w-6 font-mono text-sm tabular-nums">{auto.posicion}º</span>
        <span aria-hidden className="size-3 shrink-0" style={{ background: varColor(auto.carId) }} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm font-semibold">{auto.carId}</span>
          <span className="truncate text-xs text-muted-foreground">
            {auto.companyId ? nombreEmpresa(auto.companyId) : "Particular"}
            {auto.fleetId ? ` · ${nombreFlota(auto.fleetId)}` : ""}
          </span>
        </span>
        {llego ? (
          <span className="flex items-center gap-1 font-mono text-sm font-medium text-success tabular-nums">
            <Flag aria-label="Llegó" className="size-3.5" />
            {cronometro(auto.llegadaMs!)}
          </span>
        ) : (
          <span className="font-mono text-sm tabular-nums">{km.format(auto.recorridoM / 1000)} km</span>
        )}
      </div>
      <div
        role="progressbar"
        aria-label={`Avance de ${auto.carId}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progreso)}
        className="h-1 bg-muted"
      >
        <div className={cn("h-full", llego ? "bg-success" : "bg-primary")} style={{ width: `${progreso}%` }} />
      </div>
      <div className="flex items-center gap-3">
        <span aria-hidden className="shrink-0 text-xs text-muted-foreground">
          Velocidad
        </span>
        <Slider
          aria-label={`Velocidad de ${auto.carId}`}
          min={VELOCIDAD_MIN}
          max={VELOCIDAD_MAX}
          step={5}
          value={[kmh]}
          disabled={llego}
          onValueChange={(v) => setBorrador(Array.isArray(v) ? v[0] : v)}
          onValueCommitted={(v) => {
            setBorrador(null)
            onVelocidad(auto.carId, Array.isArray(v) ? v[0] : v)
          }}
        />
        <span className="shrink-0 text-right font-mono text-xs whitespace-nowrap tabular-nums">{kmh} km/h</span>
      </div>
    </li>
  )
}
