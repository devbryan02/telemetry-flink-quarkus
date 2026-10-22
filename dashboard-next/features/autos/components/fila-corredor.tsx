"use client"

import { Slider } from "@carbon/react"
import { Flag } from "@carbon/icons-react"
import { useState } from "react"

import { nombreEmpresa, nombreFlota } from "../filtros"
import { cronometro, km } from "../formato"
import { varColor } from "../paleta"
import type { Clasificado } from "../types"

export const VELOCIDAD_MIN = 10
export const VELOCIDAD_MAX = 500

/** Fila compacta: posición, color, auto, avance (color del auto) y slider de velocidad de Carbon. */
export function FilaCorredor({
  auto,
  longitudM,
  onVelocidad,
}: {
  auto: Clasificado
  longitudM: number
  onVelocidad: (carId: string, kmh: number) => void
}) {
  // mientras se arrastra se muestra el borrador; al soltar (o salir del control) se envía al servidor
  const [borrador, setBorrador] = useState<number | null>(null)
  const kmh = borrador ?? auto.velocidadKmh
  const enviar = () => {
    if (borrador !== null && borrador !== auto.velocidadKmh) onVelocidad(auto.carId, borrador)
    setBorrador(null)
  }

  const progreso = longitudM > 0 ? Math.min(100, (auto.recorridoM / longitudM) * 100) : 0
  const llego = auto.llegadaMs !== null
  const color = varColor(auto.carId)

  return (
    <li className="flex flex-col gap-1.5 rounded-lg bg-muted px-3 py-2.5" data-auto={auto.carId}>
      <div className="flex items-center gap-2.5">
        <span className="w-5 font-mono text-sm text-muted-foreground">{auto.posicion}º</span>
        <span aria-hidden className="size-3 shrink-0 rounded-full" style={{ background: color }} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm font-semibold">{auto.carId}</span>
          <span className="truncate text-xs text-muted-foreground">
            {auto.companyId ? nombreEmpresa(auto.companyId) : "Particular"}
            {auto.fleetId ? ` · ${nombreFlota(auto.fleetId)}` : ""}
          </span>
        </span>
        {llego ? (
          <span className="flex items-center gap-1 font-mono text-sm text-success">
            <Flag aria-label="Llegó" size={14} />
            {cronometro(auto.llegadaMs!)}
          </span>
        ) : (
          <span className="font-mono text-sm">{km.format(auto.recorridoM / 1000)} km</span>
        )}
      </div>
      <div
        role="progressbar"
        aria-label={`Avance de ${auto.carId}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progreso)}
        className="h-1 overflow-hidden rounded-full bg-border"
      >
        <div className="h-full rounded-full" style={{ width: `${progreso}%`, background: color }} />
      </div>
      <Slider
        id={`velocidad-${auto.carId}`}
        labelText={`Velocidad de ${auto.carId} (km/h)`}
        min={VELOCIDAD_MIN}
        max={VELOCIDAD_MAX}
        step={5}
        value={kmh}
        disabled={llego}
        onChange={({ value }: { value: number }) => setBorrador(value)}
        onRelease={enviar}
        onBlur={enviar}
      />
    </li>
  )
}
