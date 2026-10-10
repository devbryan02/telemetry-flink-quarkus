"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import type { Grupo } from "../agrupar"
import type { EstadoConexion } from "../hooks/use-autos-socket"

export type ResumenMetricas = {
  total: number
  visibles: number
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

/** Panel: selector de empresa y contadores en pantalla (spec §10, RF-U6). */
export function AutosStats({
  metricas,
  conexion,
  error,
  empresas,
  flotasTotal,
  particulares,
  empresaSeleccionada,
  flotasEmpresa,
  onSeleccionarEmpresa,
}: {
  metricas: ResumenMetricas
  conexion: EstadoConexion
  error: string | null
  empresas: Grupo[]
  flotasTotal: number
  particulares: number
  empresaSeleccionada: string | null
  flotasEmpresa: number
  onSeleccionarEmpresa: (companyId: string | null) => void
}) {
  const empresa = empresas.find((e) => e.id === empresaSeleccionada)
  const opciones = [
    { value: TODAS, label: "Todas las empresas" },
    ...empresas.map((e) => ({ value: e.id, label: `${e.nombre} · ${numero.format(e.total)}` })),
  ]

  return (
    <Card size="sm" className="w-64">
      <CardHeader className="flex items-center justify-between gap-2">
        <CardTitle>Flota</CardTitle>
        <Badge variant={conexion === "abierta" ? "default" : "destructive"}>{ETIQUETA_CONEXION[conexion]}</Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Select
            items={opciones}
            value={empresaSeleccionada ?? TODAS}
            onValueChange={(valor) => onSeleccionarEmpresa(!valor || valor === TODAS ? null : String(valor))}
          >
            <SelectTrigger size="sm" className="w-full" aria-label="Empresa">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {opciones.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {empresaSeleccionada && (
            <Button size="sm" variant="ghost" onClick={() => onSeleccionarEmpresa(null)}>
              Quitar
            </Button>
          )}
        </div>

        <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-sm tabular-nums">
          {empresa ? (
            <>
              <Fila etiqueta="Autos de la empresa" valor={numero.format(empresa.total)} />
              <Fila etiqueta="Flotas" valor={numero.format(flotasEmpresa)} />
              <Fila
                etiqueta="Motor encendido"
                valor={`${Math.round((empresa.encendidos / Math.max(1, empresa.total)) * 100)} %`}
              />
            </>
          ) : (
            <>
              <Fila etiqueta="Empresas" valor={numero.format(empresas.length)} />
              <Fila etiqueta="Flotas" valor={numero.format(flotasTotal)} />
              <Fila etiqueta="Particulares" valor={numero.format(particulares)} />
            </>
          )}
          <Fila
            etiqueta="Autos en pantalla"
            valor={`${numero.format(metricas.visibles)} / ${numero.format(metricas.total)}`}
          />
          <Fila etiqueta="Lotes/s" valor={metricas.lotesPorSegundo.toFixed(1)} />
          <Fila etiqueta="Edad último dato" valor={segundos(metricas.edadUltimoDatoMs)} />
          <Fila etiqueta="Latencia p95" valor={segundos(metricas.latenciaP95Ms)} />
        </dl>
        {error && <p className="text-xs text-destructive">No se pudo cargar la flota: {error}</p>}
      </CardContent>
    </Card>
  )
}
