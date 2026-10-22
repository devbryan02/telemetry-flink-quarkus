# 12 · Pantalla Repetición de un viaje

**Objetivo:** crear la ruta `/viajes/[viajeId]`, que se abre al hacer clic en un auto en Viajes. Tiene:
- **a la izquierda**, los participantes de esa carrera (con enlace a cada uno) y la vuelta a Viajes;
- **al centro**, el mapa gris con el recorrido, los puntos de muestra, los huecos marcados y la posición en el instante elegido;
- **arriba**, una tarjeta con auto, ruta, estado y los datos del resumen;
- **abajo**:
  - un reproductor: play/pausa, ±10 s, 1×/4×/16× y barra de posición;
  - el gráfico de velocidad calculada, con los huecos y la línea del instante.

La repetición empieza **en pausa**: el movimiento solo arranca si el usuario lo pide, así que no hay animación automática (`prefers-reduced-motion`).

**Archivos:**
- Modificar: `dashboard-next/features/viajes/presentacion.ts` y `presentacion.test.ts` (función `trazoVelocidad`).
- Crear:
  - `dashboard-next/features/viajes/hooks/use-repeticion.ts`;
  - `dashboard-next/features/viajes/components/repeticion-pantalla.tsx`, `recorrido-layer.tsx`, `reproductor.tsx` y `grafico-velocidad.tsx`;
  - `dashboard-next/app/viajes/[viajeId]/page.tsx`.
- Modificar: `dashboard-next/features/viajes/index.ts`.

**Interfaces:**
- Consume `obtenerViaje`, `listarViajes` y `listarPosiciones` (09); `prepararRecorrido`, `velocidades`, `huecos`, `estadoEn`, `Recorrido` e `Instante` (11); `duracion` (10); y `useEstilosMapa` y `varColor` de `@/features/autos`.
- Produce:
  - `trazoVelocidad(puntos: { ts: number; kmh: number }[], inicio: number, fin: number, ancho: number, alto: number, maxKmh: number): string`;
  - `RepeticionPantalla()`, que lee `viajeId` con `useParams`.

  La página usa `useParams` y no `params`: el proyecto tiene `cacheComponents: true`, y leer `params` en un Server Component obliga a envolverlo en `<Suspense>`.

## Pasos

- [ ] **Paso 1: test que falla de `trazoVelocidad`**

Agrega a `features/viajes/presentacion.test.ts` (y suma `trazoVelocidad` al import):

```ts
describe("trazoVelocidad", () => {
  it("escala tiempo a lo ancho y km/h a lo alto, con 0 abajo", () => {
    expect(trazoVelocidad([{ ts: 0, kmh: 0 }, { ts: 10, kmh: 80 }], 0, 10, 100, 50, 80)).toBe("M0 50 L100 0")
  })
  it("sin puntos o con duración 0 no dibuja nada", () => {
    expect(trazoVelocidad([], 0, 10, 100, 50, 80)).toBe("")
    expect(trazoVelocidad([{ ts: 5, kmh: 10 }], 5, 5, 100, 50, 80)).toBe("")
  })
  it("recorta velocidades por encima del máximo del eje", () => {
    expect(trazoVelocidad([{ ts: 0, kmh: 999 }, { ts: 10, kmh: 0 }], 0, 10, 100, 50, 80)).toBe("M0 0 L100 50")
  })
})
```

Run: `npm test`
Esperado: FAIL, porque `trazoVelocidad` no existe.

- [ ] **Paso 2: implementar `trazoVelocidad` en `presentacion.ts`**

```ts
/** Path SVG de la velocidad en el tiempo: x = ts dentro de [inicio, fin], y = km/h (0 abajo, maxKmh arriba). */
export function trazoVelocidad(
  puntos: { ts: number; kmh: number }[],
  inicio: number,
  fin: number,
  ancho: number,
  alto: number,
  maxKmh: number,
): string {
  if (puntos.length === 0 || fin <= inicio || maxKmh <= 0) return ""
  const x = (ts: number) => Math.round(((ts - inicio) / (fin - inicio)) * ancho)
  const y = (kmh: number) => Math.round(alto - (Math.min(kmh, maxKmh) / maxKmh) * alto)
  return puntos.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.ts)} ${y(p.kmh)}`).join(" ")
}
```

Run: `npm test`
Esperado: PASS.

- [ ] **Paso 3: hook de datos y reproducción `features/viajes/hooks/use-repeticion.ts`**

```ts
"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { listarPosiciones, listarViajes, obtenerViaje } from "../api"
import { estadoEn, huecos, prepararRecorrido, type Recorrido, velocidades } from "../repeticion"
import type { ViajeDetalle, ViajeVista } from "../types"

/** El simulador manda una muestra por segundo: más de 1,5 s entre dos muestras es un hueco. */
export const UMBRAL_HUECO_MS = 1_500
export const VELOCIDADES_REPRODUCCION = [1, 4, 16] as const

/** Carga el viaje, sus muestras y los de su carrera; maneja el instante de la repetición. */
export function useRepeticion(viajeId: string) {
  const [detalle, setDetalle] = useState<ViajeDetalle | null>(null)
  const [recorrido, setRecorrido] = useState<Recorrido>({ muestras: [], acumuladoM: [] })
  const [hermanos, setHermanos] = useState<ViajeVista[]>([])
  const [error, setError] = useState<string | null>(null)
  const [ts, setTs] = useState(0)
  const [reproduciendo, setReproduciendo] = useState(false)
  const [factor, setFactor] = useState<(typeof VELOCIDADES_REPRODUCCION)[number]>(4)

  useEffect(() => {
    const control = new AbortController()
    setError(null)
    setReproduciendo(false)
    Promise.all([obtenerViaje(viajeId, control.signal), listarPosiciones(viajeId, control.signal)])
      .then(async ([d, posiciones]) => {
        const r = prepararRecorrido(posiciones)
        setDetalle(d)
        setRecorrido(r)
        setTs(r.muestras[0]?.ts ?? 0)
        if (d.viaje.carreraId) {
          const pagina = await listarViajes({ carreraId: d.viaje.carreraId }, control.signal)
          setHermanos(pagina.items.filter((v) => v.estado !== "REEMPLAZADO"))
        }
      })
      .catch((e: unknown) => {
        if (control.signal.aborted) return
        const status = (e as { response?: { status?: number } }).response?.status
        setError(status === 404 ? "El viaje no existe." : e instanceof Error ? e.message : "Error desconocido")
      })
    return () => control.abort()
  }, [viajeId])

  const inicio = recorrido.muestras[0]?.ts ?? 0
  const fin = recorrido.muestras.at(-1)?.ts ?? 0

  // avance en tiempo real multiplicado por el factor; se detiene al llegar al final
  const ultimoCuadro = useRef<number | null>(null)
  useEffect(() => {
    if (!reproduciendo) return
    let id = 0
    const paso = (ahora: number) => {
      const dt = ultimoCuadro.current === null ? 0 : ahora - ultimoCuadro.current
      ultimoCuadro.current = ahora
      setTs((t) => {
        const siguiente = Math.min(fin, t + dt * factor)
        if (siguiente >= fin) setReproduciendo(false)
        return siguiente
      })
      id = requestAnimationFrame(paso)
    }
    id = requestAnimationFrame(paso)
    return () => {
      cancelAnimationFrame(id)
      ultimoCuadro.current = null
    }
  }, [reproduciendo, factor, fin])

  const saltar = useCallback((ms: number) => setTs((t) => Math.max(inicio, Math.min(fin, t + ms))), [inicio, fin])
  const alternar = useCallback(() => {
    if (!reproduciendo && ts >= fin) setTs(inicio) // play al final vuelve a empezar
    setReproduciendo((r) => !r)
  }, [reproduciendo, ts, inicio, fin])

  const puntos = useMemo(() => velocidades(recorrido), [recorrido])
  const listaHuecos = useMemo(() => huecos(recorrido, UMBRAL_HUECO_MS), [recorrido])

  return {
    detalle, recorrido, hermanos, error, inicio, fin, ts, setTs, reproduciendo, alternar, saltar, factor, setFactor,
    instante: estadoEn(recorrido, ts), puntos, huecos: listaHuecos,
  }
}
```

En `features/viajes/api.ts`, amplía el filtro de `listarViajes` con `carreraId`: el parámetro pasa a ser `filtro: { desde?: number; hasta?: number; cursor?: string; carreraId?: string }`. La API ya lo acepta (`ViajesResource.listar`).

- [ ] **Paso 4: capa del recorrido `features/viajes/components/recorrido-layer.tsx`**

```tsx
"use client"

import type { FeatureCollection, LineString, Point } from "geojson"
import type { GeoJSONSource } from "maplibre-gl"
import { useEffect } from "react"

import { useMap } from "@/components/ui/map"

import type { Hueco, Instante, Recorrido } from "../repeticion"

const F_LINEA = "rep-linea"
const F_PUNTOS = "rep-puntos"
const F_ACTUAL = "rep-actual"

/** Valor concreto de una variable CSS del tema; MapLibre no entiende `var(--x)`. */
function token(nombre: string, porDefecto: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(nombre).trim() || porDefecto
}

function linea(r: Recorrido): FeatureCollection<LineString> {
  const coords = r.muestras.map((m) => [m.lon, m.lat])
  return { type: "FeatureCollection", features: coords.length > 1 ? [{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: coords } }] : [] }
}

function puntos(r: Recorrido, hs: Hueco[]): FeatureCollection<Point> {
  const finDeHueco = new Set(hs.map((h) => h.hasta))
  return {
    type: "FeatureCollection",
    features: r.muestras.map((m) => ({
      type: "Feature",
      properties: { hueco: finDeHueco.has(m.ts) },
      geometry: { type: "Point", coordinates: [m.lon, m.lat] },
    })),
  }
}

function actual(i: Instante | null): FeatureCollection<Point> {
  return { type: "FeatureCollection", features: i ? [{ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [i.lon, i.lat] } }] : [] }
}

/** Recorrido, muestras (con los huecos resaltados) y posición actual. Se recrea al cambiar el tema. */
export function RecorridoLayer({ recorrido, huecos, instante, tokenColor }: { recorrido: Recorrido; huecos: Hueco[]; instante: Instante | null; tokenColor: string }) {
  const { map, isLoaded } = useMap()

  useEffect(() => {
    if (!map || !isLoaded || recorrido.muestras.length === 0) return
    if (!map.getSource(F_LINEA)) {
      const texto = token("--cds-text-primary", "#161616")
      const fondo = token("--cds-background", "#ffffff")
      map.addSource(F_LINEA, { type: "geojson", data: linea(recorrido) })
      map.addSource(F_PUNTOS, { type: "geojson", data: puntos(recorrido, huecos) })
      map.addSource(F_ACTUAL, { type: "geojson", data: actual(instante) })
      map.addLayer({ id: `${F_LINEA}-borde`, type: "line", source: F_LINEA, layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": fondo, "line-width": 9 } })
      map.addLayer({ id: F_LINEA, type: "line", source: F_LINEA, layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": texto, "line-width": 4 } })
      map.addLayer({
        id: F_PUNTOS,
        type: "circle",
        source: F_PUNTOS,
        minzoom: 14,
        paint: {
          "circle-radius": ["case", ["get", "hueco"], 7, 2.5],
          "circle-color": fondo,
          "circle-stroke-color": texto,
          "circle-stroke-width": ["case", ["get", "hueco"], 2, 1],
        },
      })
      map.addLayer({ id: F_ACTUAL, type: "circle", source: F_ACTUAL, paint: { "circle-radius": 10, "circle-color": token(tokenColor, "#6929c4"), "circle-stroke-color": "#ffffff", "circle-stroke-width": 2.5 } })
      const xs = recorrido.muestras.map((m) => m.lon)
      const ys = recorrido.muestras.map((m) => m.lat)
      map.fitBounds([[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)]], { padding: 80, duration: 0 })
    } else {
      ;(map.getSource(F_LINEA) as GeoJSONSource).setData(linea(recorrido))
      ;(map.getSource(F_PUNTOS) as GeoJSONSource).setData(puntos(recorrido, huecos))
    }
    // `instante` cambia en cada cuadro: lo pinta el efecto de abajo, no este
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, isLoaded, recorrido, huecos, tokenColor])

  useEffect(() => {
    if (!map || !isLoaded) return
    ;(map.getSource(F_ACTUAL) as GeoJSONSource | undefined)?.setData(actual(instante))
  }, [map, isLoaded, instante])

  return null
}
```

- [ ] **Paso 5: gráfico y reproductor**

`features/viajes/components/grafico-velocidad.tsx`:

```tsx
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
```

`features/viajes/components/reproductor.tsx`:

```tsx
"use client"

import { ContentSwitcher, IconButton, Slider, Switch } from "@carbon/react"
import { PauseFilled, PlayFilledAlt, Rewind_10, Forward_10 } from "@carbon/icons-react"

import { VELOCIDADES_REPRODUCCION } from "../hooks/use-repeticion"
import { duracion } from "../presentacion"
import type { Instante } from "../repeticion"

const km2 = new Intl.NumberFormat("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const ent = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 0 })

/** Play/pausa, ±10 s, factor de velocidad y barra de posición, con el estado del instante. */
export function Reproductor(props: {
  inicio: number
  fin: number
  ts: number
  instante: Instante | null
  reproduciendo: boolean
  factor: (typeof VELOCIDADES_REPRODUCCION)[number]
  onAlternar: () => void
  onSaltar: (ms: number) => void
  onPosicion: (ts: number) => void
  onFactor: (f: (typeof VELOCIDADES_REPRODUCCION)[number]) => void
}) {
  const { inicio, fin, ts, instante } = props
  return (
    <div className="flex flex-wrap items-center gap-3">
      <IconButton label="Retroceder 10 segundos" kind="ghost" onClick={() => props.onSaltar(-10_000)}>
        <Rewind_10 />
      </IconButton>
      <IconButton label={props.reproduciendo ? "Pausar" : "Reproducir"} kind="secondary" size="lg" onClick={props.onAlternar}>
        {props.reproduciendo ? <PauseFilled /> : <PlayFilledAlt />}
      </IconButton>
      <IconButton label="Avanzar 10 segundos" kind="ghost" onClick={() => props.onSaltar(10_000)}>
        <Forward_10 />
      </IconButton>
      <span className="font-mono text-sm" aria-live="off">
        {duracion(ts - inicio)} <span className="text-muted-foreground">/ {duracion(fin - inicio)}</span>
      </span>
      <div className="min-w-[200px] flex-1">
        <Slider
          id="posicion-repeticion"
          labelText="Posición de la repetición"
          hideTextInput
          min={inicio}
          max={Math.max(fin, inicio + 1)}
          step={1_000}
          value={ts}
          onChange={({ value }: { value: number }) => props.onPosicion(value)}
        />
      </div>
      <ContentSwitcher size="sm" selectedIndex={VELOCIDADES_REPRODUCCION.indexOf(props.factor)} onChange={({ index }) => props.onFactor(VELOCIDADES_REPRODUCCION[index ?? 0])} className="w-auto">
        {VELOCIDADES_REPRODUCCION.map((f) => (
          <Switch key={f} name={String(f)} text={`${f}×`} />
        ))}
      </ContentSwitcher>
      {instante && (
        <p className="w-full font-mono text-xs text-muted-foreground">
          {km2.format(instante.distanciaM / 1000)} km · {ent.format(instante.kmh)} km/h · batería {ent.format(instante.battery)} %
        </p>
      )}
    </div>
  )
}
```

Si `Rewind_10` o `Forward_10` no existen en tu versión de `@carbon/icons-react` (`grep -o "Rewind_10\|Forward_10" node_modules/@carbon/icons-react/lib/index.d.ts`), usa `SkipBack` y `SkipForward`.

- [ ] **Paso 6: pantalla `features/viajes/components/repeticion-pantalla.tsx`**

```tsx
"use client"

import { InlineLoading, InlineNotification, Tag } from "@carbon/react"
import { ArrowLeft } from "@carbon/icons-react"
import Link from "next/link"
import { useParams } from "next/navigation"

import { Encabezado } from "@/components/encabezado"
import { Map } from "@/components/ui/map"
import { useEstilosMapa, varColor } from "@/features/autos"

import { useRepeticion } from "../hooks/use-repeticion"
import { duracion } from "../presentacion"
import { GraficoVelocidad } from "./grafico-velocidad"
import { RecorridoLayer } from "./recorrido-layer"
import { Reproductor } from "./reproductor"

const LIMA: [number, number] = [-77.03, -12.06]
const ESTADO = { FINALIZADO: ["Finalizado", "green"], DETENIDO: ["Detenido", "gray"], SIN_CIERRE: ["Sin cierre", "blue"], REEMPLAZADO: ["Reemplazado", "gray"] } as const
const km2 = new Intl.NumberFormat("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const ent = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 1 })

/** "var(--auto-2)" → "--auto-2": MapLibre y el gráfico leen el token por nombre. */
const tokenDe = (carId: string) => varColor(carId).slice(4, -1)

export function RepeticionPantalla() {
  const { viajeId } = useParams<{ viajeId: string }>()
  const estilos = useEstilosMapa()
  const r = useRepeticion(viajeId)
  const v = r.detalle?.viaje
  const res = r.detalle?.resumen

  return (
    <>
      <Encabezado />
      <div className="flex min-h-0 flex-1 flex-wrap items-start gap-4 overflow-y-auto p-4">
        <nav aria-label="Viajes de la carrera" className="flex w-full flex-col gap-2 rounded-lg border bg-card p-2 sm:w-[280px]">
          <Link href="/viajes" className="flex items-center gap-1 px-2 py-1 text-[13px] no-underline">
            <ArrowLeft size={14} /> Viajes
          </Link>
          <ul className="flex flex-col gap-0.5">
            {r.hermanos.map((h) => (
              <li key={h.viajeId}>
                <Link
                  href={`/viajes/${h.viajeId}`}
                  aria-current={h.viajeId === viajeId ? "page" : undefined}
                  className={`flex h-9 items-center gap-2 rounded-md px-2 text-foreground no-underline ${h.viajeId === viajeId ? "bg-secondary font-semibold" : "hover:bg-muted"}`}
                >
                  <span aria-hidden className="size-2.5 rounded-full" style={{ background: varColor(h.carId) }} />
                  <span className="flex-1">{h.carId}</span>
                  <span className="text-xs text-muted-foreground">{ESTADO[h.estado][0]}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <main className="flex min-w-0 flex-[999_1_640px] flex-col gap-3">
          {r.error && <InlineNotification kind="error" lowContrast hideCloseButton title="No se pudo cargar el viaje" subtitle={r.error} />}
          {!r.error && !r.detalle && <InlineLoading description="Cargando el viaje…" />}
          {v && res && (
            <>
              <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card px-3 py-2">
                <span aria-hidden className="size-3 rounded-full" style={{ background: varColor(v.carId) }} />
                <h1 className="text-base font-semibold">
                  {v.carId} · {v.rutaId}
                </h1>
                <Tag type={ESTADO[v.estado][1]} size="sm">
                  {ESTADO[v.estado][0]}
                </Tag>
                <dl className="ml-auto flex flex-wrap gap-1.5">
                  {[
                    ["Duración", res.duracionViajeMs === null ? "—" : duracion(res.duracionViajeMs)],
                    ["Distancia", `${km2.format(res.distanciaObservadaM / 1000)} km`],
                    ["Vel. media", res.velocidadMediaObservadaKmh === null ? "—" : `${ent.format(res.velocidadMediaObservadaKmh)} km/h`],
                    ["Muestras", String(res.cantidadMuestras)],
                    ["Máx. entre muestras", `${ent.format(res.maxIntervaloMuestrasMs / 1000)} s`],
                  ].map(([dt, dd]) => (
                    <div key={dt} className="flex h-7 items-center gap-1.5 rounded-full bg-muted px-2.5">
                      <dt className="text-xs text-muted-foreground">{dt}</dt>
                      <dd className="font-mono text-xs">{dd}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div className="relative h-[440px] overflow-hidden rounded-lg border">
                <Map center={LIMA} zoom={11} styles={estilos}>
                  <RecorridoLayer recorrido={r.recorrido} huecos={r.huecos} instante={r.instante} tokenColor={tokenDe(v.carId)} />
                </Map>
              </div>
              <section aria-label="Reproducción" className="flex flex-col gap-3 rounded-lg border bg-card px-4 py-3">
                <Reproductor
                  inicio={r.inicio}
                  fin={r.fin}
                  ts={r.ts}
                  instante={r.instante}
                  reproduciendo={r.reproduciendo}
                  factor={r.factor}
                  onAlternar={r.alternar}
                  onSaltar={r.saltar}
                  onPosicion={r.setTs}
                  onFactor={r.setFactor}
                />
                <GraficoVelocidad puntos={r.puntos} huecos={r.huecos} inicio={r.inicio} fin={r.fin} ts={r.ts} tokenColor={tokenDe(v.carId)} />
              </section>
            </>
          )}
        </main>
      </div>
    </>
  )
}
```

- [ ] **Paso 7: exportar y crear la ruta**

En `features/viajes/index.ts` agrega `export { RepeticionPantalla } from "./components/repeticion-pantalla"`.

`app/viajes/[viajeId]/page.tsx`:

```tsx
import { RepeticionPantalla } from "@/features/viajes"

export default function Page() {
  return (
    <main className="flex h-dvh flex-col">
      <RepeticionPantalla />
    </main>
  )
}
```

- [ ] **Paso 8: verificar**

```bash
npm test && npm run lint && npm run build
```

Esperado: todo en verde.

Con una carrera terminada en Av. Brasil, desde `/viajes` haz clic en el 3.º y revisa:
1. **Mapa:** la ruta queda encuadrada, se ven el recorrido oscuro y el círculo del color del auto en la salida.
2. **Play a 4×:** el círculo avanza, la línea del gráfico se mueve, y los km y km/h cambian; al llegar al final se pausa solo.
3. **Controles:** ±10 s y arrastrar la barra mueven el instante.
4. **Lista de la carrera:** el resto de los autos aparece a la izquierda y un clic cambia de viaje sin recargar.
5. **Tema:** al cambiar de tema durante la reproducción, el mapa pasa a gris oscuro y el recorrido y el círculo se redibujan (Review Focus 1).
6. **Viaje inexistente:** `/viajes/00000000-0000-0000-0000-000000000000` muestra "El viaje no existe.".
7. **Huecos:** el simulador emite uno por segundo, así que en una carrera normal la leyenda del gráfico dice "Sin huecos". La detección está cubierta por los tests de `huecos` (11). No detengas la API para forzar uno: el simulador vive en la misma JVM y se pierde la carrera.

- [ ] **Paso 9: commit**

```bash
git add dashboard-next/features/viajes dashboard-next/app/viajes
git commit -m "feat(dashboard): repetición del viaje con mapa, reproductor y gráfico de velocidad

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
