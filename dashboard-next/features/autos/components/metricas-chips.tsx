import { segundos } from "../formato"
import type { ResumenMetricas } from "./carrera-panel"

/** Tres indicadores del flujo (RF-U11) como chips compactos para la barra del mapa. */
export function MetricasChips({ metricas }: { metricas: ResumenMetricas }) {
  const chips = [
    { etiqueta: "Mostrados", valor: `${metricas.mostrados}/${metricas.total}` },
    { etiqueta: "Último dato", valor: segundos(metricas.edadUltimoDatoMs) },
    { etiqueta: "Latencia p95", valor: segundos(metricas.latenciaP95Ms) },
  ]
  return (
    <dl aria-label="Métricas del flujo" className="flex flex-wrap gap-2">
      {chips.map((c) => (
        <div key={c.etiqueta} className="flex h-8 items-center gap-1.5 rounded-full bg-muted px-3">
          <dt className="text-xs text-muted-foreground">{c.etiqueta}</dt>
          <dd className="font-mono text-[13px]">{c.valor}</dd>
        </div>
      ))}
    </dl>
  )
}
