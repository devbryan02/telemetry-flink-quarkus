import type { Hueco } from "../repeticion"
import { trazoVelocidad } from "../presentacion"

const ANCHO = 1000
const ALTO = 110

/** Velocidad calculada entre muestras, con los huecos sombreados y la línea del instante actual. */
export function GraficoVelocidad({ puntos, huecos, inicio, fin, ts, tokenColor }: { puntos: { ts: number; kmh: number }[]; huecos: Hueco[]; inicio: number; fin: number; ts: number; tokenColor: string }) {
  const max = Math.max(10, Math.ceil(Math.max(0, ...puntos.map((p) => p.kmh)) / 20) * 20)
  const x = (t: number) => (fin > inicio ? ((t - inicio) / (fin - inicio)) * ANCHO : 0)
  return (
    <figure className="m-0 flex flex-col gap-1">
      <figcaption className="flex justify-between text-xs text-muted-foreground">
        <span>Velocidad calculada entre muestras (km/h, eje hasta {max})</span>
        <span>{huecos.length === 0 ? "Sin huecos" : `${huecos.length} hueco(s) mayores a 1,5 s`}</span>
      </figcaption>
      <svg role="img" aria-label={`Gráfico de velocidad, máximo ${max} km/h`} viewBox={`0 0 ${ANCHO} ${ALTO}`} preserveAspectRatio="none" className="h-[110px] w-full">
        {huecos.map((h) => (
          <rect key={h.desde} x={x(h.desde)} y={0} width={Math.max(2, x(h.hasta) - x(h.desde))} height={ALTO} fill="var(--muted)" />
        ))}
        <path d={trazoVelocidad(puntos, inicio, fin, ANCHO, ALTO, max)} fill="none" stroke={`var(${tokenColor})`} strokeWidth={2} vectorEffect="non-scaling-stroke" />
        <line x1={x(ts)} x2={x(ts)} y1={0} y2={ALTO} stroke="var(--foreground)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
      </svg>
    </figure>
  )
}
