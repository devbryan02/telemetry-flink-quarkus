"use client"

import { Flag, LocateFixed, Play, RotateCcw, Square } from "lucide-react"
import { useId } from "react"

import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

import type { Filtro, Opcion } from "../filtros"
import { cronometro, km, segundos, tiempoCarrera } from "../formato"
import type { EstadoSimulacion, ResumenRuta } from "../types"
import { FilaCorredor } from "./fila-corredor"

export type ResumenMetricas = {
  total: number
  mostrados: number
  edadUltimoDatoMs: number | null
  latenciaP95Ms: number | null
}

const TODAS = "todas"

/** Desplegable de Carbon: etiqueta visible arriba, campo con línea inferior y texto de ayuda opcional. */
function Selector({
  etiqueta,
  todas,
  opciones,
  valor,
  deshabilitado,
  ayuda,
  className,
  onCambiar,
}: {
  etiqueta: string
  todas?: string
  opciones: { value: string; label: string }[]
  valor: string | null
  deshabilitado?: boolean
  ayuda?: string
  className?: string
  onCambiar: (valor: string | null) => void
}) {
  const id = useId()
  const items = todas ? [{ value: TODAS, label: todas }, ...opciones] : opciones
  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <span id={id} className="text-xs text-muted-foreground">
        {etiqueta}
      </span>
      <Select
        items={items}
        value={valor ?? (todas ? TODAS : null)}
        disabled={deshabilitado}
        onValueChange={(v) => onCambiar(!v || v === TODAS ? null : String(v))}
      >
        <SelectTrigger
          aria-labelledby={id}
          className="h-10! w-full rounded-none border-0 border-b border-input bg-field px-4 dark:bg-field"
        >
          <SelectValue placeholder={etiqueta} />
        </SelectTrigger>
        <SelectContent>
          {items.map((i) => (
            <SelectItem key={i.value} value={i.value}>
              {i.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {ayuda && <span className="text-xs text-muted-foreground">{ayuda}</span>}
    </div>
  )
}

/** Panel: ruta, control de la carrera, clasificación con velocidad por auto, filtro y métricas (spec §10). */
export function CarreraPanel({
  rutas,
  rutaSeleccionada,
  onElegirRuta,
  simulacion,
  ocupado,
  onIniciar,
  onDetener,
  onVelocidad,
  seguirLider,
  onSeguirLider,
  empresas,
  flotas,
  filtro,
  onCambiarFiltro,
  metricas,
  ahoraMs,
  error,
}: {
  rutas: ResumenRuta[]
  rutaSeleccionada: string | null
  onElegirRuta: (id: string) => void
  simulacion: EstadoSimulacion | null
  ocupado: boolean
  onIniciar: () => void
  onDetener: () => void
  onVelocidad: (carId: string, kmh: number) => void
  seguirLider: boolean
  onSeguirLider: (seguir: boolean) => void
  empresas: Opcion[]
  flotas: Opcion[]
  filtro: Filtro
  onCambiarFiltro: (filtro: Filtro) => void
  metricas: ResumenMetricas
  /** Hora del último refresco de PanelVivo (1 s): avanza el cronómetro sin leer el reloj al renderizar */
  ahoraMs: number
  error: string | null
}) {
  const estado = simulacion?.estado ?? "LISTA"
  const enCurso = estado === "EN_CURSO"
  const ruta = rutas.find((r) => r.id === rutaSeleccionada)
  // la clasificación solo tiene sentido para la ruta de la última carrera
  const deEstaRuta = simulacion?.ruta === rutaSeleccionada
  const clasificacion = simulacion?.autos ?? []

  const nueva = estado === "TERMINADA" || (deEstaRuta && clasificacion.some((a) => a.recorridoM > 0))

  return (
    <div className="flex flex-col">
      <section className="flex flex-col gap-4 border-b p-4 pt-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl leading-7 font-normal">Carrera en {ruta?.nombre ?? "—"}</h1>
          {ruta && (
            <p className="text-xs text-muted-foreground">
              {ruta.desde} → {ruta.hasta} · {km.format(ruta.km)} km
            </p>
          )}
        </div>
        <Selector
          etiqueta="Ruta"
          opciones={rutas.map((r) => ({ value: r.id, label: `${r.nombre} · ${km.format(r.km)} km` }))}
          valor={rutaSeleccionada}
          deshabilitado={enCurso}
          ayuda={enCurso ? "No se puede cambiar con la carrera en curso" : undefined}
          onCambiar={(id) => id && onElegirRuta(id)}
        />
        <div className="flex flex-wrap gap-px">
          {enCurso ? (
            <Button
              variant="destructive"
              className="h-12 flex-1 justify-between rounded-none bg-destructive px-4 text-white hover:bg-destructive/90 dark:bg-destructive dark:hover:bg-destructive/90"
              disabled={ocupado}
              onClick={onDetener}
            >
              Detener carrera
              <Square className="fill-current" />
            </Button>
          ) : (
            <Button
              className="h-12 flex-1 justify-between rounded-none px-4"
              disabled={ocupado || !rutaSeleccionada}
              onClick={onIniciar}
            >
              {nueva ? "Nueva carrera" : "Iniciar carrera"}
              {nueva ? <RotateCcw /> : <Play className="fill-current" />}
            </Button>
          )}
          <Button
            variant={seguirLider ? "secondary" : "outline"}
            className="h-12 rounded-none px-4"
            aria-pressed={seguirLider}
            onClick={() => onSeguirLider(!seguirLider)}
          >
            <LocateFixed />
            Seguir líder
          </Button>
        </div>
        {estado === "TERMINADA" && deEstaRuta && (
          <p className="flex items-center gap-1.5 text-xs font-medium text-success">
            <Flag className="size-3.5" />
            Carrera terminada
          </p>
        )}
      </section>

      <section aria-labelledby="titulo-clasificacion" className="border-b pt-4">
        <div className="flex items-baseline justify-between px-4 pb-2">
          <h2 id="titulo-clasificacion" className="text-sm font-semibold">
            Clasificación
          </h2>
          {enCurso && deEstaRuta && (
            <span className="font-mono text-sm tabular-nums">
              {cronometro(tiempoCarrera(simulacion!.inicio, ahoraMs) ?? 0)}
            </span>
          )}
        </div>
        <ol>
          {clasificacion.map((a) => (
            <FilaCorredor
              key={a.carId}
              auto={deEstaRuta ? a : { ...a, recorridoM: 0, llegadaMs: null, posicion: a.posicion }}
              longitudM={deEstaRuta ? simulacion!.longitudM : 0}
              onVelocidad={onVelocidad}
            />
          ))}
        </ol>
      </section>

      <div className="flex flex-col gap-3 p-4">

        <div className="flex flex-col gap-2">
          <Selector
            etiqueta="Empresa"
            todas="Todas las empresas"
            opciones={empresas.map((o) => ({ value: o.id, label: `${o.nombre} · ${o.autos}` }))}
            valor={filtro.empresa}
            onCambiar={(empresa) => onCambiarFiltro({ empresa, flota: null })}
          />
          <Selector
            etiqueta="Flota"
            todas="Todas las flotas"
            opciones={flotas.map((o) => ({ value: o.id, label: `${o.nombre} · ${o.autos}` }))}
            valor={filtro.flota}
            deshabilitado={!filtro.empresa}
            onCambiar={(flota) => onCambiarFiltro({ ...filtro, flota })}
          />
        </div>

        <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-xs tabular-nums">
          <dt className="text-muted-foreground">Autos mostrados</dt>
          <dd className="text-right">
            {metricas.mostrados} / {metricas.total}
          </dd>
          <dt className="text-muted-foreground">Edad último dato</dt>
          <dd className="text-right">{segundos(metricas.edadUltimoDatoMs)}</dd>
          <dt className="text-muted-foreground">Latencia p95</dt>
          <dd className="text-right">{segundos(metricas.latenciaP95Ms)}</dd>
        </dl>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    </div>
  )
}
