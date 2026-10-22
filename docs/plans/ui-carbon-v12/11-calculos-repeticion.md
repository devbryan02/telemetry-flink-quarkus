# 11 · Cálculos de la repetición

**Objetivo:** las funciones puras que necesita la repetición de un viaje:
- ordenar las muestras;
- distancia acumulada;
- velocidad entre muestras consecutivas (la API no la trae);
- huecos entre muestras;
- estado interpolado en cualquier instante.

Sin UI.

**Archivos:**
- Crear: `dashboard-next/features/viajes/distancia.ts`, `dashboard-next/features/viajes/repeticion.ts` y `dashboard-next/features/viajes/repeticion.test.ts`.

**Interfaces:**
- Consume `PosicionVista` (de 09).
- Produce:

```ts
export type Muestra = { ts: number; lat: number; lon: number; heading: number; battery: number }
export type Recorrido = { muestras: Muestra[]; acumuladoM: number[] }   // acumuladoM[i] = metros hasta la muestra i
export type Hueco = { desde: number; hasta: number; ms: number }
export type Instante = { lat: number; lon: number; heading: number; battery: number; distanciaM: number; kmh: number; indice: number }

export function prepararRecorrido(posiciones: PosicionVista[]): Recorrido
export function velocidades(r: Recorrido): { ts: number; kmh: number }[]
export function huecos(r: Recorrido, umbralMs: number): Hueco[]
export function estadoEn(r: Recorrido, ts: number): Instante | null
```

- `distancia.ts` exporta `metros(a, b)`. Es una copia de `features/autos/distancia.ts`: una feature no importa archivos internos de otra.

**Reglas:**
- `prepararRecorrido` ordena por `ts` ascendente. Si dos muestras tienen el mismo `ts`, se queda con la primera que llegó, porque una reentrega no es un movimiento.
- `velocidades` da un punto por tramo con `dt > 0`, en km/h. Nunca `Infinity` ni `NaN`.
- `huecos` lista los tramos cuyo `dt` es mayor que `umbralMs`.
- `estadoEn`:
  - interpola lineal entre las muestras que rodean a `ts`;
  - antes del inicio devuelve la primera muestra y después del final, la última;
  - con una sola muestra devuelve esa, con `kmh` 0;
  - sin muestras devuelve `null`;
  - `kmh` es la velocidad del tramo en que cae `ts`.

## Pasos

- [ ] **Paso 1: distancia propia de la feature**

`features/viajes/distancia.ts`:

```ts
/** Distancia aproximada en metros (equirectangular); copia de la de autos: las features no comparten internos. */
export function metros(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const dy = (b.lat - a.lat) * 111_320
  const dx = (b.lon - a.lon) * 111_320 * Math.cos((a.lat * Math.PI) / 180)
  return Math.hypot(dx, dy)
}
```

- [ ] **Paso 2: tests que fallan**

`features/viajes/repeticion.test.ts`:

```ts
import { describe, expect, it } from "vitest"

import { estadoEn, huecos, prepararRecorrido, velocidades } from "./repeticion"
import type { PosicionVista } from "./types"

// 0,001° de latitud ≈ 111,32 m
function pos(ts: number, lat: number, extra: Partial<PosicionVista> = {}): PosicionVista {
  return {
    eventId: `e${ts}-${lat}`, viajeId: "v", tipoEvento: "POSICION", receivedAt: "", carId: "auto-1",
    companyId: null, fleetId: null, lat, lon: -77, heading: 0, engine: "ON", battery: 90, ts, ...extra,
  }
}

describe("prepararRecorrido", () => {
  it("ordena por ts, descarta repeticiones del mismo ts y acumula metros", () => {
    const r = prepararRecorrido([pos(2_000, -12.002), pos(0, -12.0), pos(1_000, -12.001), pos(1_000, -12.5)])
    expect(r.muestras.map((m) => m.ts)).toEqual([0, 1_000, 2_000])
    expect(r.acumuladoM[0]).toBe(0)
    expect(r.acumuladoM[2]).toBeCloseTo(222.64, 1)
  })
})

describe("velocidades", () => {
  it("111,32 m en 1 s son ~400,8 km/h", () => {
    const v = velocidades(prepararRecorrido([pos(0, -12.0), pos(1_000, -12.001)]))
    expect(v).toHaveLength(1)
    expect(v[0].ts).toBe(1_000)
    expect(v[0].kmh).toBeCloseTo(400.75, 1)
  })
  it("nunca da Infinity ni NaN, aunque haya un solo punto", () => {
    expect(velocidades(prepararRecorrido([pos(0, -12)]))).toEqual([])
    expect(velocidades(prepararRecorrido([]))).toEqual([])
  })
})

describe("huecos", () => {
  it("marca los tramos más largos que el umbral", () => {
    const r = prepararRecorrido([pos(0, -12), pos(1_000, -12.001), pos(4_000, -12.002)])
    expect(huecos(r, 1_500)).toEqual([{ desde: 1_000, hasta: 4_000, ms: 3_000 }])
  })
})

describe("estadoEn", () => {
  const r = prepararRecorrido([pos(0, -12.0, { battery: 90 }), pos(1_000, -12.001, { battery: 80 })])
  it("interpola a mitad de tramo", () => {
    const e = estadoEn(r, 500)!
    expect(e.lat).toBeCloseTo(-12.0005, 6)
    expect(e.battery).toBeCloseTo(85, 6)
    expect(e.distanciaM).toBeCloseTo(55.66, 1)
    expect(e.kmh).toBeCloseTo(400.75, 1)
    expect(e.indice).toBe(0)
  })
  it("se queda en los extremos fuera del rango", () => {
    expect(estadoEn(r, -10)!.lat).toBe(-12.0)
    expect(estadoEn(r, 9_999)!).toMatchObject({ lat: -12.001, indice: 1 })
  })
  it("una sola muestra se devuelve tal cual y sin muestras no hay estado", () => {
    expect(estadoEn(prepararRecorrido([pos(5, -12)]), 0)).toMatchObject({ lat: -12, kmh: 0, distanciaM: 0 })
    expect(estadoEn(prepararRecorrido([]), 0)).toBeNull()
  })
})
```

- [ ] **Paso 3: ver que fallan**

Run: `npm test`
Esperado: FAIL, porque no se encuentra `./repeticion`.

- [ ] **Paso 4: implementar `features/viajes/repeticion.ts`**

```ts
import { metros } from "./distancia"
import type { PosicionVista } from "./types"

export type Muestra = { ts: number; lat: number; lon: number; heading: number; battery: number }
export type Recorrido = { muestras: Muestra[]; acumuladoM: number[] }
export type Hueco = { desde: number; hasta: number; ms: number }
export type Instante = { lat: number; lon: number; heading: number; battery: number; distanciaM: number; kmh: number; indice: number }

/** Muestras en orden de tiempo (una por ts) con los metros acumulados hasta cada una. */
export function prepararRecorrido(posiciones: PosicionVista[]): Recorrido {
  const vistos = new Set<number>()
  const muestras: Muestra[] = []
  // sort es estable: con ts repetido queda la primera que llegó (una reentrega no es un movimiento)
  for (const p of [...posiciones].sort((a, b) => a.ts - b.ts)) {
    if (vistos.has(p.ts)) continue
    vistos.add(p.ts)
    muestras.push({ ts: p.ts, lat: p.lat, lon: p.lon, heading: p.heading, battery: p.battery })
  }
  const acumuladoM = muestras.map(() => 0)
  for (let i = 1; i < muestras.length; i++) acumuladoM[i] = acumuladoM[i - 1] + metros(muestras[i - 1], muestras[i])
  return { muestras, acumuladoM }
}

/** km/h del tramo [i, i+1]; los ts son únicos, pero dt <= 0 da 0 por seguridad. */
function kmhTramo(r: Recorrido, i: number): number {
  const dt = r.muestras[i + 1].ts - r.muestras[i].ts
  return dt > 0 ? ((r.acumuladoM[i + 1] - r.acumuladoM[i]) / dt) * 3_600 : 0
}

/** Velocidad de cada tramo, fechada al final del tramo. */
export function velocidades(r: Recorrido): { ts: number; kmh: number }[] {
  return r.muestras.slice(1).map((m, i) => ({ ts: m.ts, kmh: kmhTramo(r, i) }))
}

export function huecos(r: Recorrido, umbralMs: number): Hueco[] {
  const lista: Hueco[] = []
  for (let i = 1; i < r.muestras.length; i++) {
    const ms = r.muestras[i].ts - r.muestras[i - 1].ts
    if (ms > umbralMs) lista.push({ desde: r.muestras[i - 1].ts, hasta: r.muestras[i].ts, ms })
  }
  return lista
}

function instante(m: Muestra, distanciaM: number, kmh: number, indice: number): Instante {
  return { lat: m.lat, lon: m.lon, heading: m.heading, battery: m.battery, distanciaM, kmh, indice }
}

/** Estado interpolado en `ts`; en los extremos se queda en la primera o la última muestra. */
export function estadoEn(r: Recorrido, ts: number): Instante | null {
  const { muestras: m, acumuladoM: d } = r
  if (m.length === 0) return null
  const ultimo = m.length - 1
  if (m.length === 1 || ts <= m[0].ts) return instante(m[0], 0, m.length > 1 ? kmhTramo(r, 0) : 0, 0)
  if (ts >= m[ultimo].ts) return instante(m[ultimo], d[ultimo], kmhTramo(r, ultimo - 1), ultimo)
  // búsqueda binaria del tramo [lo, hi] que contiene ts
  let lo = 0
  let hi = ultimo
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (m[mid].ts <= ts) lo = mid
    else hi = mid
  }
  const a = m[lo]
  const b = m[hi]
  const f = (ts - a.ts) / (b.ts - a.ts)
  const mezcla = (x: number, y: number) => x + (y - x) * f
  return {
    lat: mezcla(a.lat, b.lat),
    lon: mezcla(a.lon, b.lon),
    heading: b.heading,
    battery: mezcla(a.battery, b.battery),
    distanciaM: mezcla(d[lo], d[hi]),
    kmh: kmhTramo(r, lo),
    indice: lo,
  }
}
```

- [ ] **Paso 5: ver que pasan**

Run: `npm test`
Esperado: PASS, los 7 casos.

- [ ] **Paso 6: verificar y commit**

```bash
npm test && npm run lint && npm run build
git add dashboard-next/features/viajes/distancia.ts dashboard-next/features/viajes/repeticion.ts dashboard-next/features/viajes/repeticion.test.ts
git commit -m "feat(dashboard): cálculos de la repetición de un viaje (velocidad, huecos e interpolación)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
