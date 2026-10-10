"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import type { Filtro, Opcion } from "../filtros"
import type { EstadoConexion } from "../hooks/use-autos-socket"
import type { EstadoSimulacion } from "../types"

export type ResumenMetricas = {
  total: number
  mostrados: number
  lotesPorSegundo: number
  edadUltimoDatoMs: number | null
  latenciaP95Ms: number | null
}

const ETIQUETA_CONEXION: Record<EstadoConexion, string> = {
  conectando: "Conectando",
  abierta: "En vivo",
  reconectando: "Reconectando",
}

const TODAS = "todas"
const numero = new Intl.NumberFormat("es-PE")

function segundos(ms: number | null): string {
  return ms === null ? "—" : `${(ms / 1000).toFixed(1)} s`
}

function Fila({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <>
      <dt className="text-muted-foreground">{etiqueta}</dt>
      <dd className="text-right">{valor}</dd>
    </>
  )
}

function Selector({
  etiqueta,
  todas,
  opciones,
  valor,
  deshabilitado,
  onCambiar,
}: {
  etiqueta: string
  todas: string
  opciones: Opcion[]
  valor: string | null
  deshabilitado?: boolean
  onCambiar: (id: string | null) => void
}) {
  const items = [
    { value: TODAS, label: todas },
    ...opciones.map((o) => ({ value: o.id, label: `${o.nombre} · ${numero.format(o.autos)}` })),
  ]
  return (
    <Select
      items={items}
      value={valor ?? TODAS}
      disabled={deshabilitado}
      onValueChange={(v) => onCambiar(!v || v === TODAS ? null : String(v))}
    >
      <SelectTrigger size="sm" className="w-full" aria-label={etiqueta}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((i) => (
          <SelectItem key={i.value} value={i.value}>
            {i.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/** Panel: control de la simulación, filtro empresa → flota y contadores (spec §10). */
export function AutosStats({
  metricas,
  conexion,
  error,
  simulacion,
  ocupado,
  onAlternarSimulacion,
  empresas,
  flotas,
  filtro,
  onCambiarFiltro,
}: {
  metricas: ResumenMetricas
  conexion: EstadoConexion
  error: string | null
  simulacion: EstadoSimulacion | null
  ocupado: boolean
  onAlternarSimulacion: () => void
  empresas: Opcion[]
  flotas: Opcion[]
  filtro: Filtro
  onCambiarFiltro: (filtro: Filtro) => void
}) {
  const enCurso = simulacion?.enCurso ?? false

  return (
    <Card size="sm" className="w-64">
      <CardHeader className="flex items-center justify-between gap-2">
        <CardTitle>Av. Brasil</CardTitle>
        <Badge variant={conexion === "abierta" ? "default" : "destructive"}>{ETIQUETA_CONEXION[conexion]}</Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="flex-1"
            variant={enCurso ? "destructive" : "default"}
            disabled={ocupado || simulacion === null}
            onClick={onAlternarSimulacion}
          >
            {enCurso ? "Detener simulación" : "Iniciar simulación"}
          </Button>
          <span className="text-xs text-muted-foreground">
            {simulacion === null ? "…" : enCurso ? `${simulacion.autos} autos` : "Detenida"}
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <Selector
            etiqueta="Empresa"
            todas="Todas las empresas"
            opciones={empresas}
            valor={filtro.empresa}
            onCambiar={(empresa) => onCambiarFiltro({ empresa, flota: null })}
          />
          <Selector
            etiqueta="Flota"
            todas="Todas las flotas"
            opciones={flotas}
            valor={filtro.flota}
            deshabilitado={!filtro.empresa}
            onCambiar={(flota) => onCambiarFiltro({ ...filtro, flota })}
          />
        </div>

        <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-sm tabular-nums">
          <Fila
            etiqueta="Autos mostrados"
            valor={`${numero.format(metricas.mostrados)} / ${numero.format(metricas.total)}`}
          />
          <Fila etiqueta="Edad último dato" valor={segundos(metricas.edadUltimoDatoMs)} />
          <Fila etiqueta="Latencia p95" valor={segundos(metricas.latenciaP95Ms)} />
          <Fila etiqueta="Lotes/s" valor={metricas.lotesPorSegundo.toFixed(1)} />
        </dl>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </CardContent>
    </Card>
  )
}
