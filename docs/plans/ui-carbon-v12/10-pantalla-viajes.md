# 10 · Pantalla Viajes (por carrera)

**Objetivo:** crear la ruta `/viajes`. Cada carrera del día elegido es una tarjeta con:
- mini mapa de la ruta;
- estado (*En curso*, *Terminada* o *Detenida*);
- clasificación: posición, auto, avance, tiempo o distancia, diferencia y velocidad media.

Arriba van los filtros por estado, ruta y fecha. Cada auto es un enlace a su repetición (`/viajes/[viajeId]`, incremento 12). Con una carrera en curso, la lista se refresca cada 5 s.

**Archivos:**
- Crear:
  - `dashboard-next/features/viajes/presentacion.ts` y `presentacion.test.ts`;
  - `dashboard-next/features/viajes/hooks/use-carreras.ts`;
  - `dashboard-next/features/viajes/components/viajes-pantalla.tsx` y `tarjeta-carrera.tsx`;
  - `dashboard-next/features/viajes/index.ts`;
  - `dashboard-next/app/viajes/page.tsx`.
- Modificar:
  - `dashboard-next/features/viajes/api.ts` y `types.ts` (rutas);
  - `dashboard-next/features/autos/index.ts` (exportar `varColor`);
  - `dashboard-next/lib/secciones.ts` (Viajes disponible).

**Interfaces:**
- Consume `agruparPorCarrera`, `Carrera`, `Participante` y `EstadoCarrera`, y `listarViajes` y `obtenerResumenes` (todos de 09), `varColor` de `@/features/autos` y `Encabezado` de `@/components/encabezado`.
- Produce las funciones de presentación:
  - `rangoDelDia(d: Date): { desde: number; hasta: number }`;
  - `filtrarCarreras(cs: Carrera[], f: { estado: EstadoCarrera | null; ruta: string | null }): Carrera[]`;
  - `conteoPorEstado(cs: Carrera[]): Record<EstadoCarrera, number>`;
  - `duracion(ms: number): string`;
  - `textoResultado(p: Participante): { valor: string; diferencia: string }`;
  - `trazoSvg(coords: [number, number][], ancho: number, alto: number, margen: number): string`.
- Produce `ViajesPantalla()`, exportado desde `features/viajes/index.ts`.

## Pasos

- [ ] **Paso 1: tests de presentación que fallan**

`features/viajes/presentacion.test.ts`:

```ts
import { describe, expect, it } from "vitest"

import type { Carrera, Participante } from "./carreras"
import { conteoPorEstado, duracion, filtrarCarreras, rangoDelDia, textoResultado, trazoSvg } from "./presentacion"

const p = (x: Partial<Participante>): Participante => ({
  viajeId: "v", carId: "auto-1", companyId: null, fleetId: null, estado: "SIN_CIERRE", posicion: 1,
  duracionMs: null, distanciaM: null, velocidadMediaKmh: null, diferenciaMs: null, diferenciaM: null, ...x,
})
const c = (x: Partial<Carrera>): Carrera => ({
  clave: "k", carreraId: null, rutaId: "av-brasil", inicioTs: 0, estado: "EN_CURSO", participantes: [], ...x,
})

describe("rangoDelDia", () => {
  it("va de la medianoche local al último milisegundo del día", () => {
    expect(rangoDelDia(new Date(2026, 9, 21, 15, 30))).toEqual({
      desde: new Date(2026, 9, 21).getTime(),
      hasta: new Date(2026, 9, 22).getTime() - 1,
    })
  })
})

describe("filtrarCarreras y conteoPorEstado", () => {
  const cs = [c({ clave: "a", estado: "EN_CURSO" }), c({ clave: "b", estado: "TERMINADA", rutaId: "panamericana-sur" })]
  it("sin filtro devuelve todas", () => expect(filtrarCarreras(cs, { estado: null, ruta: null })).toHaveLength(2))
  it("filtra por estado y por ruta a la vez", () => {
    expect(filtrarCarreras(cs, { estado: "TERMINADA", ruta: null }).map((x) => x.clave)).toEqual(["b"])
    expect(filtrarCarreras(cs, { estado: "TERMINADA", ruta: "av-brasil" })).toEqual([])
  })
  it("cuenta por estado, con 0 en los que faltan", () =>
    expect(conteoPorEstado(cs)).toEqual({ EN_CURSO: 1, TERMINADA: 1, DETENIDA: 0 }))
})

describe("duracion y textoResultado", () => {
  it("minutos y segundos, con horas si pasa de 60 min", () => {
    expect(duracion(234_000)).toBe("3:54")
    expect(duracion(4 * 3_600_000 + 5 * 60_000 + 7_000)).toBe("4:05:07")
  })
  it("finalizado: tiempo y diferencia con el ganador", () => {
    expect(textoResultado(p({ estado: "FINALIZADO", duracionMs: 312_000, diferenciaMs: 78_000 }))).toEqual({ valor: "5:12", diferencia: "+1:18" })
    expect(textoResultado(p({ estado: "FINALIZADO", duracionMs: 234_000, diferenciaMs: 0 })).diferencia).toBe("—")
  })
  it("sin llegar: distancia y metros detrás del que va adelante", () => {
    expect(textoResultado(p({ distanciaM: 2_570, diferenciaM: -850 }))).toEqual({ valor: "2.57 km", diferencia: "−0.85 km" })
    expect(textoResultado(p({ distanciaM: 3_420, diferenciaM: 0 })).diferencia).toBe("adelante")
    expect(textoResultado(p({}))).toEqual({ valor: "—", diferencia: "—" })
  })
})

describe("trazoSvg", () => {
  it("encaja la línea en la caja con margen y el norte hacia arriba", () => {
    expect(trazoSvg([[0, 0], [10, 10]], 100, 100, 10)).toBe("M10 90 L90 10")
  })
  it("con menos de 2 puntos no dibuja nada", () => expect(trazoSvg([[1, 1]], 100, 100, 10)).toBe(""))
  it("un tramo sin extensión no produce NaN", () => expect(trazoSvg([[5, 5], [5, 5]], 100, 100, 10)).not.toContain("NaN"))
})
```

- [ ] **Paso 2: ver que fallan**

Run: `npm test`
Esperado: FAIL, porque no se encuentra `./presentacion`.

- [ ] **Paso 3: implementar `features/viajes/presentacion.ts`**

```ts
import type { Carrera, EstadoCarrera, Participante } from "./carreras"

const km2 = new Intl.NumberFormat("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** Día local completo de la fecha dada, en epoch ms (los filtros `desde`/`hasta` de GET /viajes). */
export function rangoDelDia(d: Date): { desde: number; hasta: number } {
  const desde = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const hasta = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime() - 1
  return { desde, hasta }
}

export function filtrarCarreras(cs: Carrera[], f: { estado: EstadoCarrera | null; ruta: string | null }): Carrera[] {
  return cs.filter((c) => (!f.estado || c.estado === f.estado) && (!f.ruta || c.rutaId === f.ruta))
}

export function conteoPorEstado(cs: Carrera[]): Record<EstadoCarrera, number> {
  const conteo: Record<EstadoCarrera, number> = { EN_CURSO: 0, TERMINADA: 0, DETENIDA: 0 }
  for (const c of cs) conteo[c.estado]++
  return conteo
}

/** 234000 → "3:54"; con horas → "4:05:07". Se redondea al segundo. */
export function duracion(ms: number): string {
  const t = Math.round(ms / 1000)
  const h = Math.floor(t / 3600)
  const m = Math.floor((t % 3600) / 60)
  const s = String(t % 60).padStart(2, "0")
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`
}

/** Lo que muestra la fila: tiempo y diferencia si llegó; si no, distancia y metros detrás. */
export function textoResultado(p: Participante): { valor: string; diferencia: string } {
  if (p.estado === "FINALIZADO") {
    return {
      valor: p.duracionMs === null ? "—" : duracion(p.duracionMs),
      diferencia: !p.diferenciaMs ? "—" : `+${duracion(p.diferenciaMs)}`,
    }
  }
  return {
    valor: p.distanciaM === null ? "—" : `${km2.format(p.distanciaM / 1000)} km`,
    diferencia: p.diferenciaM === null ? "—" : p.diferenciaM === 0 ? "adelante" : `−${km2.format(-p.diferenciaM / 1000)} km`,
  }
}

/** Path SVG de una LineString [lon, lat] dentro de `ancho`×`alto`, con margen y el norte arriba. */
export function trazoSvg(coords: [number, number][], ancho: number, alto: number, margen: number): string {
  if (coords.length < 2) return ""
  const xs = coords.map((c) => c[0])
  const ys = coords.map((c) => c[1])
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
  // misma escala en ambos ejes para no deformar la ruta; un tramo sin extensión usa escala 1
  const escala = Math.min((ancho - 2 * margen) / (x1 - x0 || 1), (alto - 2 * margen) / (y1 - y0 || 1))
  const px = (x: number) => Math.round(margen + (x - x0) * escala)
  const py = (y: number) => Math.round(alto - margen - (y - y0) * escala)
  return coords.map((c, i) => `${i === 0 ? "M" : "L"}${px(c[0])} ${py(c[1])}`).join(" ")
}
```

- [ ] **Paso 4: ver que pasan**

Run: `npm test`
Esperado: PASS.

Si `"2.57 km"` falla por el separador decimal: el repo usa `es-PE`, que en Node da punto (ver `features/autos/formato.test.ts`). Ajusta el test al separador que devuelve `Intl` en tu Node, no el formateador.

- [ ] **Paso 5: rutas en el cliente de viajes**

En `features/viajes/types.ts` agrega:

```ts
export type ResumenRuta = { id: string; nombre: string; desde: string; hasta: string; km: number }
export type GeometriaRuta = { features: { geometry: { coordinates: [number, number][] } }[] }
```

En `features/viajes/api.ts` agrega (copia propia de la feature; `autos` tiene la suya):

```ts
export async function listarRutas(signal?: AbortSignal): Promise<ResumenRuta[]> {
  const { data } = await http.get<ResumenRuta[]>("/rutas", { signal })
  return data
}

export async function obtenerGeometria(id: string, signal?: AbortSignal): Promise<GeometriaRuta> {
  const { data } = await http.get<GeometriaRuta>(`/rutas/${encodeURIComponent(id)}`, { signal })
  return data
}
```

Y amplía el `import type` de `./types` con `ResumenRuta` y `GeometriaRuta`.

- [ ] **Paso 6: hook de datos `features/viajes/hooks/use-carreras.ts`**

```ts
"use client"

import { useCallback, useEffect, useState } from "react"

import { listarViajes, obtenerResumenes } from "../api"
import { agruparPorCarrera, type Carrera } from "../carreras"
import { rangoDelDia } from "../presentacion"
import type { ResumenViaje, ViajeVista } from "../types"

const REFRESCO_EN_CURSO_MS = 5_000

type Estado = { carreras: Carrera[]; cargando: boolean; error: string | null; hayMas: boolean }

/** Viajes del día agrupados por carrera; refresca mientras hay una carrera en curso y solo hay una página. */
export function useCarreras(fecha: Date) {
  const [viajes, setViajes] = useState<ViajeVista[]>([])
  const [resumenes, setResumenes] = useState(new Map<string, ResumenViaje>())
  const [cursor, setCursor] = useState<string | null>(null)
  const [paginas, setPaginas] = useState(0)
  const [estado, setEstado] = useState<Omit<Estado, "carreras" | "hayMas">>({ cargando: true, error: null })
  const dia = fecha.toDateString()

  const cargar = useCallback(
    async (desdeCursor: string | null, signal?: AbortSignal) => {
      const { desde, hasta } = rangoDelDia(new Date(dia))
      const pagina = await listarViajes({ desde, hasta, cursor: desdeCursor ?? undefined }, signal)
      const nuevos = await obtenerResumenes(pagina.items.map((v) => v.viajeId), signal)
      return { pagina, nuevos }
    },
    [dia],
  )

  // primera página al cambiar de día
  useEffect(() => {
    const control = new AbortController()
    setEstado({ cargando: true, error: null })
    cargar(null, control.signal)
      .then(({ pagina, nuevos }) => {
        setViajes(pagina.items)
        setResumenes(nuevos)
        setCursor(pagina.nextCursor)
        setPaginas(1)
        setEstado({ cargando: false, error: null })
      })
      .catch((e: unknown) => {
        if (!control.signal.aborted) setEstado({ cargando: false, error: e instanceof Error ? e.message : "Error desconocido" })
      })
    return () => control.abort()
  }, [cargar])

  const carreras = agruparPorCarrera(viajes, resumenes)
  const enCurso = paginas === 1 && carreras.some((c) => c.estado === "EN_CURSO")

  // con una carrera en curso, la primera página se vuelve a pedir cada 5 s
  useEffect(() => {
    if (!enCurso) return
    const id = setInterval(() => {
      cargar(null)
        .then(({ pagina, nuevos }) => {
          setViajes(pagina.items)
          setResumenes(nuevos)
          setCursor(pagina.nextCursor)
        })
        .catch(() => undefined)
    }, REFRESCO_EN_CURSO_MS)
    return () => clearInterval(id)
  }, [enCurso, cargar])

  const cargarMas = useCallback(async () => {
    if (!cursor) return
    setEstado((e) => ({ ...e, cargando: true }))
    try {
      const { pagina, nuevos } = await cargar(cursor)
      setViajes((vs) => [...vs, ...pagina.items])
      setResumenes((r) => new Map([...r, ...nuevos]))
      setCursor(pagina.nextCursor)
      setPaginas((n) => n + 1)
      setEstado({ cargando: false, error: null })
    } catch (e) {
      setEstado({ cargando: false, error: e instanceof Error ? e.message : "Error desconocido" })
    }
  }, [cursor, cargar])

  return { carreras, ...estado, hayMas: cursor !== null, cargarMas }
}
```

- [ ] **Paso 7: tarjeta de una carrera `features/viajes/components/tarjeta-carrera.tsx`**

```tsx
import { Tag } from "@carbon/react"
import { PlayFilledAlt } from "@carbon/icons-react"
import Link from "next/link"

import { varColor } from "@/features/autos"

import type { Carrera, EstadoCarrera } from "../carreras"
import { textoResultado } from "../presentacion"

const ESTADO: Record<EstadoCarrera, { texto: string; tipo: "blue" | "green" | "gray" }> = {
  EN_CURSO: { texto: "En curso", tipo: "blue" },
  TERMINADA: { texto: "Terminada", tipo: "green" },
  DETENIDA: { texto: "Detenida", tipo: "gray" },
}
const hora = new Intl.DateTimeFormat("es-PE", { hour: "2-digit", minute: "2-digit" })
const kmh = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 0 })

/** Una carrera: mini mapa, estado y clasificación; cada auto lleva a su repetición. */
export function TarjetaCarrera({
  carrera,
  nombreRuta,
  longitudKm,
  trazo,
}: {
  carrera: Carrera
  nombreRuta: string
  longitudKm: number | null
  trazo: string
}) {
  const estado = ESTADO[carrera.estado]
  const ganador = carrera.participantes[0]
  return (
    <li className="flex flex-wrap gap-5 rounded-lg border bg-card p-4">
      <svg role="img" aria-label={`Ruta ${nombreRuta}`} viewBox="0 0 200 120" className="h-[120px] w-[200px] shrink-0 rounded-lg bg-muted">
        {trazo && <path d={trazo} fill="none" stroke="var(--cds-text-primary)" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />}
      </svg>
      <div className="flex min-w-0 flex-[1_1_480px] flex-col gap-2.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h2 className="text-base font-semibold">{nombreRuta}</h2>
          <Tag type={estado.tipo} size="sm">
            {estado.texto}
          </Tag>
          <span className="text-xs text-muted-foreground">
            {hora.format(carrera.inicioTs)}
            {longitudKm !== null && ` · ${longitudKm} km`}
          </span>
          {ganador && (
            <Link
              href={`/viajes/${ganador.viajeId}`}
              className="ml-auto flex h-8 items-center gap-1.5 rounded-full border border-foreground px-3.5 text-[13px] text-foreground no-underline"
            >
              Ver repetición
              <PlayFilledAlt size={14} />
            </Link>
          )}
        </div>
        <ol className="flex flex-col gap-0.5">
          {carrera.participantes.map((p) => {
            const { valor, diferencia } = textoResultado(p)
            const avance =
              p.estado === "FINALIZADO" ? 100 : longitudKm && p.distanciaM !== null ? Math.min(100, p.distanciaM / (longitudKm * 10)) : 0
            return (
              <li key={p.viajeId}>
                <Link
                  href={`/viajes/${p.viajeId}`}
                  title={`Ver el viaje de ${p.carId}`}
                  className="grid min-h-10 grid-cols-[28px_minmax(120px,1.2fr)_minmax(80px,2fr)_88px_80px_72px] items-center gap-3 rounded-md px-2 text-foreground no-underline hover:bg-muted"
                >
                  <span className="flex size-6 items-center justify-center rounded-full bg-muted font-mono text-xs">{p.posicion}</span>
                  <span className="flex min-w-0 items-center gap-2">
                    <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: varColor(p.carId) }} />
                    <strong className="font-semibold">{p.carId}</strong>
                  </span>
                  <span role="progressbar" aria-label={`Avance de ${p.carId}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(avance)} className="h-1 overflow-hidden rounded-full bg-border">
                    <span className="block h-full rounded-full" style={{ width: `${avance}%`, background: varColor(p.carId) }} />
                  </span>
                  <span className="text-right font-mono">{valor}</span>
                  <span className="text-right font-mono text-xs text-muted-foreground">{diferencia}</span>
                  <span className="text-right font-mono text-xs text-muted-foreground">
                    {p.velocidadMediaKmh === null ? "—" : `${kmh.format(p.velocidadMediaKmh)} km/h`}
                  </span>
                </Link>
              </li>
            )
          })}
        </ol>
      </div>
    </li>
  )
}
```

`avance`: `distanciaM / (longitudKm * 1000) * 100`, que se simplifica a `distanciaM / (longitudKm * 10)`.

- [ ] **Paso 8: pantalla `features/viajes/components/viajes-pantalla.tsx`**

```tsx
"use client"

import { Button, ContentSwitcher, DatePicker, DatePickerInput, InlineLoading, InlineNotification, Select, SelectItem, Switch } from "@carbon/react"
import { useEffect, useMemo, useState } from "react"

import { Encabezado } from "@/components/encabezado"

import { listarRutas, obtenerGeometria } from "../api"
import type { EstadoCarrera } from "../carreras"
import { useCarreras } from "../hooks/use-carreras"
import { conteoPorEstado, filtrarCarreras, trazoSvg } from "../presentacion"
import type { ResumenRuta } from "../types"
import { TarjetaCarrera } from "./tarjeta-carrera"

const ESTADOS: (EstadoCarrera | null)[] = [null, "EN_CURSO", "TERMINADA", "DETENIDA"]
const NOMBRE: Record<EstadoCarrera, string> = { EN_CURSO: "En curso", TERMINADA: "Terminadas", DETENIDA: "Detenidas" }

/** Viajes del día agrupados por carrera (diseño "Moderno · Viajes"). */
export function ViajesPantalla() {
  const [fecha, setFecha] = useState(() => new Date())
  const [estado, setEstado] = useState<EstadoCarrera | null>(null)
  const [ruta, setRuta] = useState<string | null>(null)
  const [rutas, setRutas] = useState<ResumenRuta[]>([])
  const [trazos, setTrazos] = useState(new Map<string, string>())
  const { carreras, cargando, error, hayMas, cargarMas } = useCarreras(fecha)

  useEffect(() => {
    const control = new AbortController()
    listarRutas(control.signal).then(setRutas).catch(() => undefined)
    return () => control.abort()
  }, [])

  // geometría de cada ruta presente, una sola vez
  const rutasPresentes = useMemo(() => [...new Set(carreras.map((c) => c.rutaId))], [carreras])
  useEffect(() => {
    for (const id of rutasPresentes) {
      if (trazos.has(id)) continue
      obtenerGeometria(id)
        .then((g) => setTrazos((t) => new Map(t).set(id, trazoSvg(g.features[0]?.geometry.coordinates ?? [], 200, 120, 12))))
        .catch(() => setTrazos((t) => new Map(t).set(id, "")))
    }
  }, [rutasPresentes, trazos])

  const conteo = conteoPorEstado(carreras)
  const visibles = filtrarCarreras(carreras, { estado, ruta })
  const nombre = (id: string) => rutas.find((r) => r.id === id)?.nombre ?? id
  const longitud = (id: string) => rutas.find((r) => r.id === id)?.km ?? null

  return (
    <>
      <Encabezado />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-[1312px] flex-col gap-5 px-6 pt-7 pb-10">
          <div className="flex flex-col gap-1">
            <h1 className="text-[28px] leading-9 font-normal">Viajes</h1>
            <p className="text-muted-foreground">
              {carreras.length} carreras · {carreras.reduce((n, c) => n + c.participantes.length, 0)} viajes
            </p>
          </div>

          <div role="toolbar" aria-label="Filtros" className="flex flex-wrap items-end gap-3">
            <ContentSwitcher
              size="sm"
              selectedIndex={ESTADOS.indexOf(estado)}
              onChange={({ index }) => setEstado(ESTADOS[index ?? 0])}
              className="w-auto"
            >
              {ESTADOS.map((e) => (
                <Switch key={e ?? "todas"} name={e ?? "todas"} text={e ? `${NOMBRE[e]} · ${conteo[e]}` : `Todas · ${carreras.length}`} />
              ))}
            </ContentSwitcher>
            <Select id="filtro-ruta" inline size="sm" labelText="Ruta" value={ruta ?? ""} onChange={(e) => setRuta(e.target.value || null)}>
              <SelectItem value="" text="Todas" />
              {rutas.map((r) => (
                <SelectItem key={r.id} value={r.id} text={r.nombre} />
              ))}
            </Select>
            <DatePicker datePickerType="single" dateFormat="d/m/Y" value={fecha} onChange={([d]) => d && setFecha(d)}>
              <DatePickerInput id="filtro-fecha" labelText="Fecha" placeholder="dd/mm/aaaa" size="sm" />
            </DatePicker>
          </div>

          {error && <InlineNotification kind="error" lowContrast hideCloseButton title="No se pudieron cargar los viajes" subtitle={error} />}
          {cargando && carreras.length === 0 && <InlineLoading description="Cargando viajes…" />}
          {!cargando && !error && visibles.length === 0 && (
            <p className="rounded-lg border p-6 text-muted-foreground">No hay carreras con estos filtros en la fecha elegida.</p>
          )}

          <ul className="flex flex-col gap-3">
            {visibles.map((c) => (
              <TarjetaCarrera key={c.clave} carrera={c} nombreRuta={nombre(c.rutaId)} longitudKm={longitud(c.rutaId)} trazo={trazos.get(c.rutaId) ?? ""} />
            ))}
          </ul>

          {hayMas && (
            <Button kind="tertiary" size="md" disabled={cargando} onClick={() => void cargarMas()} className="self-center">
              {cargando ? "Cargando…" : "Cargar más carreras"}
            </Button>
          )}
        </div>
      </div>
    </>
  )
}
```

- [ ] **Paso 9: exportar y crear la ruta**

`features/viajes/index.ts`:

```ts
// API pública de la feature (STD-ARCH-001): app/ solo importa desde aquí.
export { ViajesPantalla } from "./components/viajes-pantalla"
```

`app/viajes/page.tsx`:

```tsx
import { ViajesPantalla } from "@/features/viajes"

export default function Page() {
  return (
    <main className="flex h-dvh flex-col">
      <ViajesPantalla />
    </main>
  )
}
```

En `features/autos/index.ts` agrega `export { varColor } from "./paleta"`. En `lib/secciones.ts`, cambia Viajes a `disponible: true`.

- [ ] **Paso 10: verificar**

```bash
npm test && npm run lint && npm run build
```

Esperado: todo en verde.

Con la API arriba, haz dos carreras (una terminada y una en curso). Después:
- en http://localhost:3000/viajes aparece *Viajes* activo en la cabecera;
- se ven dos tarjetas: la en curso arriba, con distancias y "adelante" en el líder, y se actualiza sola;
- en la terminada, el ganador tiene "—" y los demás "+m:ss";
- el filtro *Terminadas* deja solo esa tarjeta;
- con una fecha sin carreras se ve el mensaje vacío;
- un clic en un auto navega a `/viajes/<uuid>`. Esa ruta da 404 hasta 12; es lo esperado.

- [ ] **Paso 11: commit**

```bash
git add dashboard-next/features/viajes dashboard-next/app/viajes/page.tsx dashboard-next/features/autos/index.ts dashboard-next/lib/secciones.ts
git commit -m "feat(dashboard): pantalla Viajes agrupada por carrera con clasificación

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
