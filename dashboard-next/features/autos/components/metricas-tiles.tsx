import { segundos } from "../formato"
import type { ResumenMetricas } from "./carrera-panel"

/** Tres indicadores del flujo (RF-U11) en una grilla de tiles separados por 1 px. */
export function MetricasTiles({ metricas }: { metricas: ResumenMetricas }) {
  const tiles = [
    { etiqueta: "Mostrados", valor: `${metricas.mostrados}/${metricas.total}` },
    { etiqueta: "Último dato", valor: segundos(metricas.edadUltimoDatoMs) },
    { etiqueta: "Latencia p95", valor: segundos(metricas.latenciaP95Ms) },
  ]
  return (
    <dl aria-label="Métricas del flujo" className="grid grid-cols-3 gap-px border-b bg-border">
      {tiles.map((t) => (
        <div key={t.etiqueta} className="flex flex-col gap-1 bg-card px-4 py-3">
          <dt className="text-xs text-muted-foreground">{t.etiqueta}</dt>
          <dd className="font-mono text-xl tabular-nums">{t.valor}</dd>
        </div>
      ))}
    </dl>
  )
}
