import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

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

const numero = new Intl.NumberFormat("es-PE")

function segundos(ms: number | null): string {
  return ms === null ? "—" : `${(ms / 1000).toFixed(1)} s`
}

/** Contadores en pantalla (spec §10, RF-U6). */
export function AutosStats({
  metricas,
  conexion,
  error,
}: {
  metricas: ResumenMetricas
  conexion: EstadoConexion
  error: string | null
}) {
  return (
    <Card size="sm" className="w-56">
      <CardHeader className="flex items-center justify-between gap-2">
        <CardTitle>Flota</CardTitle>
        <Badge variant={conexion === "abierta" ? "default" : "destructive"}>{ETIQUETA_CONEXION[conexion]}</Badge>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-sm tabular-nums">
          <dt className="text-muted-foreground">Autos visibles</dt>
          <dd>
            {numero.format(metricas.visibles)} / {numero.format(metricas.total)}
          </dd>
          <dt className="text-muted-foreground">Lotes/s</dt>
          <dd>{metricas.lotesPorSegundo.toFixed(1)}</dd>
          <dt className="text-muted-foreground">Edad último dato</dt>
          <dd>{segundos(metricas.edadUltimoDatoMs)}</dd>
          <dt className="text-muted-foreground">Latencia p95</dt>
          <dd>{segundos(metricas.latenciaP95Ms)}</dd>
        </dl>
        {error && <p className="mt-2 text-xs text-destructive">No se pudo cargar la flota: {error}</p>}
      </CardContent>
    </Card>
  )
}
