"use client"

import { ContentSwitcher, IconButton, Slider, Switch } from "@carbon/react"
import { PauseFilled, PlayFilledAlt, Rewind_10, Forward_10 } from "@carbon/icons-react"

import { VELOCIDADES_REPRODUCCION } from "../hooks/use-repeticion"
import { duracion } from "../presentacion"
import type { Instante } from "../repeticion"

const km2 = new Intl.NumberFormat("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const ent = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 0 })

/** Play/pausa, ±10 s, factor de velocidad y barra de posición, con el estado del instante. */
export function Reproductor(props: {
  inicio: number
  fin: number
  ts: number
  instante: Instante | null
  reproduciendo: boolean
  factor: (typeof VELOCIDADES_REPRODUCCION)[number]
  onAlternar: () => void
  onSaltar: (ms: number) => void
  onPosicion: (ts: number) => void
  onFactor: (f: (typeof VELOCIDADES_REPRODUCCION)[number]) => void
}) {
  const { inicio, fin, ts, instante } = props
  return (
    <div className="flex flex-wrap items-center gap-3">
      <IconButton label="Retroceder 10 segundos" kind="ghost" onClick={() => props.onSaltar(-10_000)}>
        <Rewind_10 />
      </IconButton>
      <IconButton label={props.reproduciendo ? "Pausar" : "Reproducir"} kind="secondary" size="lg" onClick={props.onAlternar}>
        {props.reproduciendo ? <PauseFilled /> : <PlayFilledAlt />}
      </IconButton>
      <IconButton label="Avanzar 10 segundos" kind="ghost" onClick={() => props.onSaltar(10_000)}>
        <Forward_10 />
      </IconButton>
      <span className="font-mono text-sm" aria-live="off">
        {duracion(ts - inicio)} <span className="text-muted-foreground">/ {duracion(fin - inicio)}</span>
      </span>
      <div className="min-w-[200px] flex-1">
        <Slider
          id="posicion-repeticion"
          labelText="Posición de la repetición"
          hideTextInput
          min={inicio}
          max={Math.max(fin, inicio + 1)}
          step={1_000}
          value={ts}
          onChange={({ value }: { value: number }) => props.onPosicion(value)}
        />
      </div>
      <ContentSwitcher size="sm" selectedIndex={VELOCIDADES_REPRODUCCION.indexOf(props.factor)} onChange={({ index }) => props.onFactor(VELOCIDADES_REPRODUCCION[index ?? 0])} className="w-auto">
        {VELOCIDADES_REPRODUCCION.map((f) => (
          <Switch key={f} name={String(f)} text={`${f}×`} />
        ))}
      </ContentSwitcher>
      {instante && (
        <p className="w-full font-mono text-xs text-muted-foreground">
          {km2.format(instante.distanciaM / 1000)} km · {ent.format(instante.kmh)} km/h · batería {ent.format(instante.battery)} %
        </p>
      )}
    </div>
  )
}
