"use client"

import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SelectorTema } from "@/components/selector-tema"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"

import { type Filtro, nombreEmpresa, nombreFlota, type Opcion } from "../filtros"
import { cronometro, km, segundos } from "../formato"
import type { EstadoConexion } from "../hooks/use-autos-socket"
import type { Clasificado, EstadoSimulacion, ResumenRuta } from "../types"

export const VELOCIDAD_MIN = 10
export const VELOCIDAD_MAX = 500

export type ResumenMetricas = {
  total: number
  mostrados: number
  edadUltimoDatoMs: number | null
  latenciaP95Ms: number | null
}

const ETIQUETA_CONEXION: Record<EstadoConexion, string> = {
  conectando: "Conectando",
  abierta: "En vivo",
  reconectando: "Reconectando",
}

const TODAS = "todas"

function Selector({
  etiqueta,
  todas,
  opciones,
  valor,
  deshabilitado,
  onCambiar,
}: {
  etiqueta: string
  todas?: string
  opciones: { value: string; label: string }[]
  valor: string | null
  deshabilitado?: boolean
  onCambiar: (valor: string | null) => void
}) {
  const items = todas ? [{ value: TODAS, label: todas }, ...opciones] : opciones
  return (
    <Select
      items={items}
      value={valor ?? (todas ? TODAS : null)}
      disabled={deshabilitado}
      onValueChange={(v) => onCambiar(!v || v === TODAS ? null : String(v))}
    >
      <SelectTrigger size="sm" className="w-full" aria-label={etiqueta}>
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
  )
}

/** Fila de la clasificación: posición, progreso, llegada y slider de velocidad del auto. */
function FilaCorredor({
  auto,
  longitudM,
  onVelocidad,
}: {
  auto: Clasificado
  longitudM: number
  onVelocidad: (carId: string, kmh: number) => void
}) {
  // mientras se arrastra se muestra el borrador; al soltar se envía y vuelve a mandar el valor del servidor
  const [borrador, setBorrador] = useState<number | null>(null)
  const kmh = borrador ?? auto.velocidadKmh

  const progreso = longitudM > 0 ? Math.min(100, (auto.recorridoM / longitudM) * 100) : 0
  const llego = auto.llegadaMs !== null

  return (
    <li className="flex flex-col gap-1.5 rounded-lg border p-2" data-auto={auto.carId}>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-semibold tabular-nums">{auto.posicion}º</span>
        <span className="flex-1 truncate">
          <span className="font-medium">{auto.carId}</span>
          <span className="text-xs text-muted-foreground">
            {" "}
            · {auto.companyId ? nombreEmpresa(auto.companyId) : "Particular"}
            {auto.fleetId ? ` · ${nombreFlota(auto.fleetId)}` : ""}
          </span>
        </span>
        <span className={cn("text-xs tabular-nums", llego && "font-semibold text-green-600 dark:text-green-400")}>
          {llego ? `🏁 ${cronometro(auto.llegadaMs!)}` : `${km.format(auto.recorridoM / 1000)} km`}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full", llego ? "bg-green-500" : "bg-sky-500")} style={{ width: `${progreso}%` }} />
      </div>
      <div className="flex items-center gap-2">
        <Slider
          aria-label={`Velocidad de ${auto.carId}`}
          min={VELOCIDAD_MIN}
          max={VELOCIDAD_MAX}
          step={5}
          value={[kmh]}
          disabled={llego}
          onValueChange={(v) => setBorrador(Array.isArray(v) ? v[0] : v)}
          onValueCommitted={(v) => {
            setBorrador(null)
            onVelocidad(auto.carId, Array.isArray(v) ? v[0] : v)
          }}
        />
        <span className="w-16 text-right text-xs tabular-nums">{kmh} km/h</span>
      </div>
    </li>
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
  conexion,
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
  conexion: EstadoConexion
  error: string | null
}) {
  const estado = simulacion?.estado ?? "LISTA"
  const enCurso = estado === "EN_CURSO"
  const ruta = rutas.find((r) => r.id === rutaSeleccionada)
  // la clasificación solo tiene sentido para la ruta de la última carrera
  const deEstaRuta = simulacion?.ruta === rutaSeleccionada
  const clasificacion = simulacion?.autos ?? []

  return (
    <Card size="sm" className="flex max-h-[calc(100dvh-1.5rem)] w-80 flex-col">
      <CardHeader className="flex items-center justify-between gap-2">
        <CardTitle>Carrera</CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant={conexion === "abierta" ? "default" : "destructive"}>{ETIQUETA_CONEXION[conexion]}</Badge>
          <SelectorTema />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 overflow-y-auto">
        <Selector
          etiqueta="Ruta"
          opciones={rutas.map((r) => ({ value: r.id, label: `${r.nombre} · ${km.format(r.km)} km` }))}
          valor={rutaSeleccionada}
          deshabilitado={enCurso}
          onCambiar={(id) => id && onElegirRuta(id)}
        />
        {ruta && (
          <p className="-mt-1.5 text-xs text-muted-foreground">
            {ruta.desde} → {ruta.hasta}
          </p>
        )}

        <div className="flex gap-2">
          {enCurso ? (
            <Button size="sm" variant="destructive" className="flex-1" disabled={ocupado} onClick={onDetener}>
              Detener
            </Button>
          ) : (
            <Button size="sm" className="flex-1" disabled={ocupado || !rutaSeleccionada} onClick={onIniciar}>
              {estado === "TERMINADA" || (deEstaRuta && clasificacion.some((a) => a.recorridoM > 0))
                ? "Nueva carrera"
                : "Iniciar carrera"}
            </Button>
          )}
          <Button
            size="sm"
            variant={seguirLider ? "secondary" : "outline"}
            aria-pressed={seguirLider}
            onClick={() => onSeguirLider(!seguirLider)}
          >
            Seguir al líder
          </Button>
        </div>
        {estado === "TERMINADA" && deEstaRuta && (
          <p className="text-xs font-medium text-green-600 dark:text-green-400">Carrera terminada 🏁</p>
        )}

        <ol className="flex flex-col gap-2">
          {clasificacion.map((a) => (
            <FilaCorredor
              key={a.carId}
              auto={deEstaRuta ? a : { ...a, recorridoM: 0, llegadaMs: null, posicion: a.posicion }}
              longitudM={deEstaRuta ? simulacion!.longitudM : 0}
              onVelocidad={onVelocidad}
            />
          ))}
        </ol>

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
      </CardContent>
    </Card>
  )
}
