"use client"

import { Select, SelectItem } from "@carbon/react"

import type { Filtro, Opcion } from "../filtros"
import type { ResumenMetricas } from "./carrera-panel"
import { MetricasChips } from "./metricas-chips"

const TODAS = ""

/** Barra flotante: filtro empresa → flota y métricas del flujo. */
export function BarraMapa({
  empresas,
  flotas,
  filtro,
  onCambiarFiltro,
  metricas,
}: {
  empresas: Opcion[]
  flotas: Opcion[]
  filtro: Filtro
  onCambiarFiltro: (filtro: Filtro) => void
  metricas: ResumenMetricas
}) {
  return (
    <div
      role="toolbar"
      aria-label="Filtro y métricas"
      className="pointer-events-auto flex min-w-0 flex-[1_1_480px] flex-wrap items-center gap-2 rounded-lg bg-card p-2 shadow-flotante"
    >
      <Select
        id="empresa"
        inline
        size="sm"
        labelText="Empresa"
        value={filtro.empresa ?? TODAS}
        onChange={(e) => onCambiarFiltro({ empresa: e.target.value || null, flota: null })}
      >
        <SelectItem value={TODAS} text="Todas" />
        {empresas.map((o) => (
          <SelectItem key={o.id} value={o.id} text={`${o.nombre} · ${o.autos}`} />
        ))}
      </Select>
      <Select
        id="flota"
        inline
        size="sm"
        labelText="Flota"
        value={filtro.flota ?? TODAS}
        disabled={!filtro.empresa}
        onChange={(e) => onCambiarFiltro({ ...filtro, flota: e.target.value || null })}
      >
        <SelectItem value={TODAS} text="Todas" />
        {flotas.map((o) => (
          <SelectItem key={o.id} value={o.id} text={`${o.nombre} · ${o.autos}`} />
        ))}
      </Select>
      <span aria-hidden className="h-6 w-px bg-border" />
      <MetricasChips metricas={metricas} />
    </div>
  )
}
