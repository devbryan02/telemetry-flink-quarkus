# 04 · Controles de la carrera con Carbon

**Objetivo:** pasar a componentes de Carbon los controles del panel de Carrera: selector de ruta, iniciar/detener, seguir al líder y velocidad por auto. Además, la clasificación queda compacta, como en el diseño.

- Filtros y métricas se quedan donde están; 05 los mueve sobre el mapa.
- Sin lógica nueva: los tests existentes (`formato`, `filtros`, `ruta-progreso`) cubren lo que se muestra.

**Archivos:**
- Reescribir: `dashboard-next/features/autos/components/carrera-panel.tsx`.
- Reescribir: `dashboard-next/features/autos/components/fila-corredor.tsx`.

**Interfaces:**
- Consume `Button`, `IconButton`, `Select`, `SelectItem`, `Slider` e `InlineNotification` de `@carbon/react`, e íconos de `@carbon/icons-react`.
- Las props de `CarreraPanel` y `FilaCorredor` **no cambian**, así que `autos-map.tsx` sigue igual.
- `ResumenMetricas`, `VELOCIDAD_MIN` y `VELOCIDAD_MAX` siguen exportados.

## Pasos

- [x] **Paso 1: fila de la clasificación**

Reemplaza `features/autos/components/fila-corredor.tsx`:

```tsx
"use client"

import { Slider } from "@carbon/react"
import { Flag } from "@carbon/icons-react"
import { useState } from "react"

import { nombreEmpresa, nombreFlota } from "../filtros"
import { cronometro, km } from "../formato"
import { varColor } from "../paleta"
import type { Clasificado } from "../types"

export const VELOCIDAD_MIN = 10
export const VELOCIDAD_MAX = 500

/** Fila compacta: posición, color, auto, avance (color del auto) y slider de velocidad de Carbon. */
export function FilaCorredor({
  auto,
  longitudM,
  onVelocidad,
}: {
  auto: Clasificado
  longitudM: number
  onVelocidad: (carId: string, kmh: number) => void
}) {
  // mientras se arrastra se muestra el borrador; al soltar (o salir del control) se envía al servidor
  const [borrador, setBorrador] = useState<number | null>(null)
  const kmh = borrador ?? auto.velocidadKmh
  const enviar = () => {
    if (borrador !== null && borrador !== auto.velocidadKmh) onVelocidad(auto.carId, borrador)
    setBorrador(null)
  }

  const progreso = longitudM > 0 ? Math.min(100, (auto.recorridoM / longitudM) * 100) : 0
  const llego = auto.llegadaMs !== null
  const color = varColor(auto.carId)

  return (
    <li className="flex flex-col gap-1.5 rounded-lg bg-muted px-3 py-2.5" data-auto={auto.carId}>
      <div className="flex items-center gap-2.5">
        <span className="w-5 font-mono text-sm text-muted-foreground">{auto.posicion}º</span>
        <span aria-hidden className="size-3 shrink-0 rounded-full" style={{ background: color }} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm font-semibold">{auto.carId}</span>
          <span className="truncate text-xs text-muted-foreground">
            {auto.companyId ? nombreEmpresa(auto.companyId) : "Particular"}
            {auto.fleetId ? ` · ${nombreFlota(auto.fleetId)}` : ""}
          </span>
        </span>
        {llego ? (
          <span className="flex items-center gap-1 font-mono text-sm text-success">
            <Flag aria-label="Llegó" size={14} />
            {cronometro(auto.llegadaMs!)}
          </span>
        ) : (
          <span className="font-mono text-sm">{km.format(auto.recorridoM / 1000)} km</span>
        )}
      </div>
      <div
        role="progressbar"
        aria-label={`Avance de ${auto.carId}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progreso)}
        className="h-1 overflow-hidden rounded-full bg-border"
      >
        <div className="h-full rounded-full" style={{ width: `${progreso}%`, background: color }} />
      </div>
      <Slider
        id={`velocidad-${auto.carId}`}
        labelText={`Velocidad de ${auto.carId} (km/h)`}
        min={VELOCIDAD_MIN}
        max={VELOCIDAD_MAX}
        step={5}
        value={kmh}
        disabled={llego}
        onChange={({ value }: { value: number }) => setBorrador(value)}
        onRelease={enviar}
        onBlur={enviar}
      />
    </li>
  )
}
```

- [x] **Paso 2: panel con controles de Carbon**

Reemplaza `features/autos/components/carrera-panel.tsx` (mismas props que hoy):

```tsx
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
```

- [x] **Paso 3: verificar**

```bash
npm test && npm run lint && npm run build
```

Esperado: todo en verde. Si TypeScript rechaza una prop de `Slider` (`onRelease` u `onBlur`), revisa `node_modules/@carbon/react/lib/components/Slider/Slider.d.ts` y usa la prop equivalente que declare (por ejemplo, `onRelease` sin argumentos). No uses `any`.

En el navegador:
- los botones son píldoras grises (v12);
- el ícono de seguir líder es un círculo y alterna su estado;
- mover el slider de un auto con el mouse cambia su velocidad al soltar;
- con el teclado (flechas y luego Tab), cambia al salir del control;
- con la carrera en curso, la ruta queda bloqueada y muestra el texto de ayuda.

- [x] **Paso 4: commit**

```bash
git add dashboard-next/features/autos/components/carrera-panel.tsx dashboard-next/features/autos/components/fila-corredor.tsx
git commit -m "feat(dashboard): controles de la carrera con componentes de Carbon v12

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
