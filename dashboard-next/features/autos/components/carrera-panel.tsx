"use client"

import { Button, IconButton, InlineNotification, Select, SelectItem } from "@carbon/react"
import { Flag, LocationCurrent, PlayFilledAlt, Renew, StopFilledAlt } from "@carbon/icons-react"

import type { Filtro, Opcion } from "../filtros"
import { cronometro, km, tiempoCarrera } from "../formato"
import type { EstadoSimulacion, ResumenRuta } from "../types"
import { FilaCorredor } from "./fila-corredor"
import { MetricasTiles } from "./metricas-tiles"

export type ResumenMetricas = {
  total: number
  mostrados: number
  edadUltimoDatoMs: number | null
  latenciaP95Ms: number | null
}

const TODAS = ""

/** Panel de la carrera (spec §10): ruta, control, clasificación con velocidad, filtro y métricas. */
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
      <section className="flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            {enCurso ? "En curso" : estado === "TERMINADA" ? "Terminada" : "Lista"}
          </span>
          {enCurso && deEstaRuta && (
            <span aria-label="Tiempo de carrera" className="font-mono text-xl">
              {cronometro(tiempoCarrera(simulacion!.inicio, ahoraMs) ?? 0)}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-0.5">
          <h1 className="text-xl font-normal">Carrera en {ruta?.nombre ?? "—"}</h1>
          {ruta && (
            <p className="text-xs text-muted-foreground">
              {ruta.desde} → {ruta.hasta} · {km.format(ruta.km)} km
            </p>
          )}
        </div>
        <Select
          id="ruta"
          labelText="Ruta"
          helperText={enCurso ? "Bloqueada durante la carrera" : undefined}
          value={rutaSeleccionada ?? ""}
          disabled={enCurso}
          onChange={(e) => e.target.value && onElegirRuta(e.target.value)}
        >
          {rutas.map((r) => (
            <SelectItem key={r.id} value={r.id} text={`${r.nombre} · ${km.format(r.km)} km`} />
          ))}
        </Select>
        <div className="flex gap-2">
          {enCurso ? (
            <Button kind="secondary" className="flex-1" renderIcon={StopFilledAlt} disabled={ocupado} onClick={onDetener}>
              Detener carrera
            </Button>
          ) : (
            <Button
              kind="secondary"
              className="flex-1"
              renderIcon={nueva ? Renew : PlayFilledAlt}
              disabled={ocupado || !rutaSeleccionada}
              onClick={onIniciar}
            >
              {nueva ? "Nueva carrera" : "Iniciar carrera"}
            </Button>
          )}
          <IconButton
            label={seguirLider ? "Dejar de seguir al líder" : "Seguir al líder"}
            kind={seguirLider ? "secondary" : "tertiary"}
            aria-pressed={seguirLider}
            onClick={() => onSeguirLider(!seguirLider)}
          >
            <LocationCurrent />
          </IconButton>
        </div>
        {estado === "TERMINADA" && deEstaRuta && (
          <p className="flex items-center gap-1.5 text-xs font-semibold text-success">
            <Flag size={14} />
            Carrera terminada
          </p>
        )}
      </section>

      <section aria-labelledby="titulo-clasificacion" className="flex flex-col gap-2 border-t px-2 pt-3 pb-2">
        <h2 id="titulo-clasificacion" className="px-2 text-sm font-semibold">
          Clasificación
        </h2>
        <ol className="flex flex-col gap-1">
          {clasificacion.map((a) => (
            <FilaCorredor
              key={a.carId}
              auto={deEstaRuta ? a : { ...a, recorridoM: 0, llegadaMs: null }}
              longitudM={deEstaRuta ? simulacion!.longitudM : 0}
              onVelocidad={onVelocidad}
            />
          ))}
        </ol>
      </section>

      <section aria-labelledby="titulo-filtro" className="flex flex-col gap-3 border-t p-4">
        <h2 id="titulo-filtro" className="text-sm font-semibold">
          Filtrar autos
        </h2>
        <div className="flex flex-wrap gap-2">
          <Select
            id="empresa"
            labelText="Empresa"
            className="flex-[1_1_150px]"
            value={filtro.empresa ?? TODAS}
            onChange={(e) => onCambiarFiltro({ empresa: e.target.value || null, flota: null })}
          >
            <SelectItem value={TODAS} text="Todas las empresas" />
            {empresas.map((o) => (
              <SelectItem key={o.id} value={o.id} text={`${o.nombre} · ${o.autos}`} />
            ))}
          </Select>
          <Select
            id="flota"
            labelText="Flota"
            className="flex-[1_1_150px]"
            value={filtro.flota ?? TODAS}
            disabled={!filtro.empresa}
            onChange={(e) => onCambiarFiltro({ ...filtro, flota: e.target.value || null })}
          >
            <SelectItem value={TODAS} text="Todas las flotas" />
            {flotas.map((o) => (
              <SelectItem key={o.id} value={o.id} text={`${o.nombre} · ${o.autos}`} />
            ))}
          </Select>
        </div>
      </section>

      <MetricasTiles metricas={metricas} />
      {error && (
        <InlineNotification kind="error" lowContrast hideCloseButton title="Error" subtitle={error} className="m-4" />
      )}
    </div>
  )
}
