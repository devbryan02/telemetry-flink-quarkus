# 09 · Datos de viajes: cliente y agrupación por carrera

**Objetivo:** crear la feature `features/viajes/` con:
- los tipos del contrato de `/viajes`;
- el cliente HTTP;
- la función pura que convierte una página de viajes en **carreras con su clasificación**.

Sin UI todavía.

**Archivos:**
- Crear: `dashboard-next/features/viajes/types.ts`, `api.ts`, `carreras.ts` y `carreras.test.ts`.

**Interfaces:**
- Consume `http` de `@/lib/http`: axios con `NEXT_PUBLIC_API_URL`.
- Produce los tipos (copia del contrato Java en `telemetry-api/src/main/java/dev/bryan/viajes/`):

```ts
export type EstadoViaje = "SIN_CIERRE" | "FINALIZADO" | "DETENIDO" | "REEMPLAZADO"
export type ViajeVista = { viajeId: string; carreraId: string | null; carId: string; rutaId: string; companyId: string | null; fleetId: string | null; inicioViajeTs: number; finTs: number | null; estado: EstadoViaje; motivoFin: string | null; ultimoTs: number }
export type ResumenViaje = { cantidadMuestras: number; ultimoTs: number; duracionObservadaMs: number; duracionViajeMs: number | null; distanciaObservadaM: number; velocidadMediaObservadaKmh: number | null; maxIntervaloMuestrasMs: number }
export type ViajeDetalle = { viaje: ViajeVista; resumen: ResumenViaje }
export type PosicionVista = { eventId: string; viajeId: string; tipoEvento: string; receivedAt: string; carId: string; companyId: string | null; fleetId: string | null; lat: number; lon: number; heading: number; engine: string; battery: number; ts: number }
export type Pagina<T> = { items: T[]; nextCursor: string | null }
```

- Produce el cliente:
  - `listarViajes(filtro: { desde?: number; hasta?: number; cursor?: string }, signal?): Promise<Pagina<ViajeVista>>`;
  - `obtenerViaje(viajeId, signal?): Promise<ViajeDetalle>`;
  - `obtenerResumenes(ids: string[], signal?): Promise<Map<string, ResumenViaje>>`, de 6 en 6;
  - `listarPosiciones(viajeId, signal?): Promise<PosicionVista[]>`, que recorre todas las páginas.
- Produce la agrupación:

```ts
export type EstadoCarrera = "EN_CURSO" | "TERMINADA" | "DETENIDA"
export type Participante = { viajeId: string; carId: string; companyId: string | null; fleetId: string | null; estado: EstadoViaje; posicion: number; duracionMs: number | null; distanciaM: number | null; velocidadMediaKmh: number | null; diferenciaMs: number | null; diferenciaM: number | null }
export type Carrera = { clave: string; carreraId: string | null; rutaId: string; inicioTs: number; estado: EstadoCarrera; participantes: Participante[] }
export function agruparPorCarrera(viajes: ViajeVista[], resumenes: Map<string, ResumenViaje>): Carrera[]
```

**Reglas de `agruparPorCarrera`:**
- Agrupa por `carreraId`. Un viaje sin `carreraId` forma su propia "carrera", con clave `viaje:<viajeId>`.
- Ignora los viajes `REEMPLAZADO`: otro viaje los reemplazó.
- Estado de la carrera:
  - `EN_CURSO` si algún viaje está `SIN_CIERRE`;
  - si no, `DETENIDA` si alguno está `DETENIDO`;
  - si no, `TERMINADA`.
- Orden de los participantes:
  1. primero los `FINALIZADO`, por duración ascendente;
  2. después el resto, por distancia descendente, con `null` al final;
  3. en los empates, por `carId` (numérico: `auto-2` antes que `auto-10`).
- Diferencias:
  - finalizado: `diferenciaMs` contra el ganador (0 el primero);
  - no finalizado: `diferenciaM` contra la mayor distancia de la carrera, ≤ 0 (0 el que va adelante).
- Duración: `resumen.duracionViajeMs ?? (finTs - inicioViajeTs)`, y `null` si no hay ninguna de las dos.
- Distancia y velocidad: las del resumen, o `null` sin resumen.
- Carreras ordenadas por `inicioTs` descendente (la más reciente primero).

## Pasos

- [x] **Paso 1: tipos**

Crea `features/viajes/types.ts` con exactamente los 6 tipos del bloque de Interfaces, cada uno con `export`, y este comentario arriba: `/** Contrato de GET /viajes (spec de persistencia §5.2). Copia propia de la feature: no se comparte con autos. */`.

- [x] **Paso 2: tests que fallan**

`features/viajes/carreras.test.ts`:

```ts
import { describe, expect, it } from "vitest"

import { agruparPorCarrera } from "./carreras"
import type { ResumenViaje, ViajeVista } from "./types"

const C1 = "11111111-1111-1111-1111-111111111111"
const C2 = "22222222-2222-2222-2222-222222222222"

function viaje(p: Partial<ViajeVista> & Pick<ViajeVista, "viajeId" | "carId">): ViajeVista {
  return {
    carreraId: C1, rutaId: "av-brasil", companyId: "emp-01", fleetId: "emp-01-f1",
    inicioViajeTs: 1_000, finTs: null, estado: "SIN_CIERRE", motivoFin: null, ultimoTs: 2_000, ...p,
  }
}
function resumen(distanciaM: number, duracionViajeMs: number | null = null): ResumenViaje {
  return {
    cantidadMuestras: 10, ultimoTs: 0, duracionObservadaMs: 0, duracionViajeMs,
    distanciaObservadaM: distanciaM, velocidadMediaObservadaKmh: 60, maxIntervaloMuestrasMs: 1_000,
  }
}

describe("agruparPorCarrera", () => {
  it("ordena a los que llegaron por tiempo y calcula la diferencia con el ganador", () => {
    const viajes = [
      viaje({ viajeId: "a", carId: "auto-1", estado: "FINALIZADO", finTs: 1_000 + 312_000 }),
      viaje({ viajeId: "b", carId: "auto-3", estado: "FINALIZADO", finTs: 1_000 + 234_000 }),
      viaje({ viajeId: "c", carId: "auto-2", estado: "FINALIZADO", finTs: 1_000 + 267_000 }),
    ]
    const [c] = agruparPorCarrera(viajes, new Map())
    expect(c.estado).toBe("TERMINADA")
    expect(c.participantes.map((p) => [p.carId, p.posicion, p.diferenciaMs])).toEqual([
      ["auto-3", 1, 0],
      ["auto-2", 2, 33_000],
      ["auto-1", 3, 78_000],
    ])
  })

  it("en curso ordena por distancia y da la diferencia en metros con el que va adelante", () => {
    const viajes = [viaje({ viajeId: "a", carId: "auto-1" }), viaje({ viajeId: "b", carId: "auto-3" })]
    const r = new Map([["a", resumen(2_570)], ["b", resumen(3_420)]])
    const [c] = agruparPorCarrera(viajes, r)
    expect(c.estado).toBe("EN_CURSO")
    expect(c.participantes.map((p) => [p.carId, p.diferenciaM])).toEqual([["auto-3", 0], ["auto-1", -850]])
  })

  it("prefiere la duración del resumen y deja sin distancia a quien no tiene resumen, al final", () => {
    const viajes = [
      viaje({ viajeId: "a", carId: "auto-1", estado: "DETENIDO", finTs: 9_000 }),
      viaje({ viajeId: "b", carId: "auto-2", estado: "DETENIDO", finTs: 9_000 }),
    ]
    const [c] = agruparPorCarrera(viajes, new Map([["b", resumen(500, 7_777)]]))
    expect(c.estado).toBe("DETENIDA")
    expect(c.participantes[0]).toMatchObject({ carId: "auto-2", duracionMs: 7_777, distanciaM: 500 })
    expect(c.participantes[1]).toMatchObject({ carId: "auto-1", duracionMs: 8_000, distanciaM: null, diferenciaM: null })
  })

  it("ignora los reemplazados, separa los viajes sin carrera y ordena carreras de la más reciente a la más antigua", () => {
    const viajes = [
      viaje({ viajeId: "viejo", carId: "auto-1", estado: "REEMPLAZADO" }),
      viaje({ viajeId: "a", carId: "auto-1", carreraId: C2, inicioViajeTs: 5_000 }),
      viaje({ viajeId: "suelto", carId: "auto-9", carreraId: null, inicioViajeTs: 3_000 }),
      viaje({ viajeId: "b", carId: "auto-2" }),
    ]
    const carreras = agruparPorCarrera(viajes, new Map())
    expect(carreras.map((c) => c.clave)).toEqual([C2, "viaje:suelto", C1])
    expect(carreras[2].participantes.map((p) => p.viajeId)).toEqual(["b"])
  })

  it("una carrera cortada por la paginación (2 de 3 autos) se muestra con los que llegaron en la página", () => {
    const [c] = agruparPorCarrera([viaje({ viajeId: "a", carId: "auto-1" }), viaje({ viajeId: "b", carId: "auto-2" })], new Map())
    expect(c.participantes).toHaveLength(2)
  })

  it("los empates se ordenan por carId numérico", () => {
    const [c] = agruparPorCarrera([viaje({ viajeId: "x", carId: "auto-10" }), viaje({ viajeId: "y", carId: "auto-2" })], new Map())
    expect(c.participantes.map((p) => p.carId)).toEqual(["auto-2", "auto-10"])
  })

  it("una página vacía no tiene carreras", () => expect(agruparPorCarrera([], new Map())).toEqual([]))
})
```

- [x] **Paso 3: ver que fallan**

Run: `npm test`
Esperado: FAIL, porque no se encuentra `./carreras`.

- [x] **Paso 4: implementar `features/viajes/carreras.ts`**

```ts
import type { EstadoViaje, ResumenViaje, ViajeVista } from "./types"

export type EstadoCarrera = "EN_CURSO" | "TERMINADA" | "DETENIDA"
export type Participante = {
  viajeId: string
  carId: string
  companyId: string | null
  fleetId: string | null
  estado: EstadoViaje
  posicion: number
  duracionMs: number | null
  distanciaM: number | null
  velocidadMediaKmh: number | null
  /** Solo finalizados: tiempo perdido contra el ganador (0 el primero) */
  diferenciaMs: number | null
  /** Solo no finalizados: metros contra el que va más adelante (0 o negativo) */
  diferenciaM: number | null
}
export type Carrera = {
  clave: string
  carreraId: string | null
  rutaId: string
  inicioTs: number
  estado: EstadoCarrera
  participantes: Participante[]
}

const porCarId = (a: { carId: string }, b: { carId: string }) => a.carId.localeCompare(b.carId, "es", { numeric: true })

function participante(v: ViajeVista, r: ResumenViaje | undefined): Participante {
  const duracionMs = r?.duracionViajeMs ?? (v.finTs !== null ? v.finTs - v.inicioViajeTs : null)
  return {
    viajeId: v.viajeId,
    carId: v.carId,
    companyId: v.companyId,
    fleetId: v.fleetId,
    estado: v.estado,
    posicion: 0,
    duracionMs,
    distanciaM: r?.distanciaObservadaM ?? null,
    velocidadMediaKmh: r?.velocidadMediaObservadaKmh ?? null,
    diferenciaMs: null,
    diferenciaM: null,
  }
}

function clasificar(ps: Participante[]): Participante[] {
  const llegaron = ps.filter((p) => p.estado === "FINALIZADO")
  const resto = ps.filter((p) => p.estado !== "FINALIZADO")
  llegaron.sort((a, b) => (a.duracionMs ?? Infinity) - (b.duracionMs ?? Infinity) || porCarId(a, b))
  resto.sort((a, b) => (b.distanciaM ?? -Infinity) - (a.distanciaM ?? -Infinity) || porCarId(a, b))
  const ganador = llegaron[0]?.duracionMs ?? null
  const masLejos = Math.max(...ps.map((p) => p.distanciaM ?? -Infinity))
  return [...llegaron, ...resto].map((p, i) => ({
    ...p,
    posicion: i + 1,
    diferenciaMs: p.estado === "FINALIZADO" && ganador !== null && p.duracionMs !== null ? p.duracionMs - ganador : null,
    diferenciaM: p.estado !== "FINALIZADO" && p.distanciaM !== null ? p.distanciaM - masLejos : null,
  }))
}

function estadoDe(ps: Participante[]): EstadoCarrera {
  if (ps.some((p) => p.estado === "SIN_CIERRE")) return "EN_CURSO"
  if (ps.some((p) => p.estado === "DETENIDO")) return "DETENIDA"
  return "TERMINADA"
}

/** Una página de viajes como carreras con clasificación; la más reciente primero. */
export function agruparPorCarrera(viajes: ViajeVista[], resumenes: Map<string, ResumenViaje>): Carrera[] {
  const grupos = new Map<string, ViajeVista[]>()
  for (const v of viajes) {
    if (v.estado === "REEMPLAZADO") continue
    const clave = v.carreraId ?? `viaje:${v.viajeId}`
    grupos.set(clave, [...(grupos.get(clave) ?? []), v])
  }
  return [...grupos]
    .map(([clave, vs]) => {
      const participantes = clasificar(vs.map((v) => participante(v, resumenes.get(v.viajeId))))
      return {
        clave,
        carreraId: vs[0].carreraId,
        rutaId: vs[0].rutaId,
        inicioTs: Math.min(...vs.map((v) => v.inicioViajeTs)),
        estado: estadoDe(participantes),
        participantes,
      }
    })
    .sort((a, b) => b.inicioTs - a.inicioTs)
}
```

- [x] **Paso 5: ver que pasan**

Run: `npm test`
Esperado: PASS, los 7 casos.

- [x] **Paso 6: cliente `features/viajes/api.ts`**

```ts
import { http } from "@/lib/http"

import type { Pagina, PosicionVista, ResumenViaje, ViajeDetalle, ViajeVista } from "./types"

/** Límite por página que pide la pantalla; la API acepta de 1 a 1000 (ConsultaPagina). */
const LIMITE_VIAJES = 100
const LIMITE_POSICIONES = 1_000
/** Corte de seguridad: 50 páginas de 1000 = 13,9 h de muestras a 1 por segundo. */
const MAX_PAGINAS_POSICIONES = 50
const LOTE_RESUMENES = 6

export async function listarViajes(
  filtro: { desde?: number; hasta?: number; cursor?: string },
  signal?: AbortSignal,
): Promise<Pagina<ViajeVista>> {
  const { data } = await http.get<Pagina<ViajeVista>>("/viajes", { params: { ...filtro, limit: LIMITE_VIAJES }, signal })
  return data
}

export async function obtenerViaje(viajeId: string, signal?: AbortSignal): Promise<ViajeDetalle> {
  const { data } = await http.get<ViajeDetalle>(`/viajes/${encodeURIComponent(viajeId)}`, { signal })
  return data
}

/** Resumen de cada viaje, de 6 en 6 para no saturar la API. */
export async function obtenerResumenes(ids: string[], signal?: AbortSignal): Promise<Map<string, ResumenViaje>> {
  const resumenes = new Map<string, ResumenViaje>()
  for (let i = 0; i < ids.length; i += LOTE_RESUMENES) {
    const lote = await Promise.all(ids.slice(i, i + LOTE_RESUMENES).map((id) => obtenerViaje(id, signal)))
    for (const d of lote) resumenes.set(d.viaje.viajeId, d.resumen)
  }
  return resumenes
}

/** Todas las muestras del viaje en orden de la API, recorriendo el cursor. */
export async function listarPosiciones(viajeId: string, signal?: AbortSignal): Promise<PosicionVista[]> {
  const todas: PosicionVista[] = []
  let cursor: string | undefined
  for (let pagina = 0; pagina < MAX_PAGINAS_POSICIONES; pagina++) {
    const { data } = await http.get<Pagina<PosicionVista>>(`/viajes/${encodeURIComponent(viajeId)}/posiciones`, {
      params: { limit: LIMITE_POSICIONES, cursor },
      signal,
    })
    todas.push(...data.items)
    if (!data.nextCursor) break
    cursor = data.nextCursor
  }
  return todas
}
```

El tope de 1000 por página viene de `ConsultaPagina` (`limit` entre 1 y 1000; si no, responde 400).

- [x] **Paso 7: verificar**

```bash
npm test && npm run lint && npm run build
```

Esperado: todo en verde.

Con la API arriba y al menos una carrera hecha, desde la raíz del repo:

```bash
curl -s "localhost:8080/viajes?limit=5" | head -c 400
```

Esperado: un JSON `{"items":[{"viajeId":…,"carreraId":…}],"nextCursor":…}` con los mismos nombres de campo que `types.ts`.

- [x] **Paso 8: commit**

```bash
git add dashboard-next/features/viajes/types.ts dashboard-next/features/viajes/api.ts \
  dashboard-next/features/viajes/carreras.ts dashboard-next/features/viajes/carreras.test.ts
git commit -m "feat(dashboard): cliente de viajes y agrupación por carrera con clasificación

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
