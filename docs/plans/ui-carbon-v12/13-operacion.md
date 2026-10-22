# 13 · Pantalla Operación

**Objetivo:** crear la ruta `/operacion`, con la salud de la API (`/q/health/ready`), el flujo de eventos y las métricas de `/q/metrics`. Se refresca cada 5 s.

Solo muestra datos que el backend ya publica. Los nombres salen de `docs/test-cases/persistencia-posiciones-viajes.md` (§ Señales operativas):

| Métrica | Uso |
|---|---|
| `viajes_eventos_insertados_total` | eventos por segundo |
| `viajes_eventos_duplicados_total` | reentregas ignoradas |
| `viajes_eventos_invalidos_total` | eventos inválidos |
| `viajes_persistencia_fallos_total`, `autos_persistencia_fallos_total` | lotes revertidos |
| `viajes_sin_cierre` | viajes abiertos |
| `kafka_consumer_fetch_manager_records_lag_max{client_id="kafka-consumer-<canal>"}` | lag de cada canal |

**Archivos:**
- Crear:
  - `dashboard-next/features/operacion/salud.ts` y `salud.test.ts`;
  - `dashboard-next/features/operacion/prometheus.ts` y `prometheus.test.ts`;
  - `dashboard-next/features/operacion/api.ts`;
  - `dashboard-next/features/operacion/components/operacion-pantalla.tsx`;
  - `dashboard-next/features/operacion/index.ts`;
  - `dashboard-next/app/operacion/page.tsx`.
- Modificar: `dashboard-next/lib/secciones.ts` (Operación disponible) y `dashboard-next/.env.example` (si existe; si no, el `README.md` del dashboard) con `NEXT_PUBLIC_FLINK_UI_URL`.

**Interfaces:**
- Produce la salud:

```ts
export type Check = { name: string; status: "UP" | "DOWN"; data?: Record<string, unknown> }
export type Salud = { status: "UP" | "DOWN"; checks: Check[]; error: string | null }
export type FilaSalud = { nombre: string; ok: boolean; detalle: string }
export function interpretarSalud(httpStatus: number, cuerpo: unknown): Salud
export function filasSalud(s: Salud): FilaSalud[]
```

- Produce Prometheus:

```ts
export type MuestraProm = { nombre: string; etiquetas: Record<string, string>; valor: number }
export function parsearPrometheus(texto: string): MuestraProm[]
export function valor(ms: MuestraProm[], nombre: string, etiquetas?: Record<string, string>): number | null
export function tasaPorSegundo(anterior: number | null, actual: number | null, dtMs: number): number | null
```

- Produce el cliente: `obtenerSalud(): Promise<Salud>`, que **no lanza** con 503, y `obtenerMetricas(): Promise<MuestraProm[]>`.
- Produce `OperacionPantalla()`.

## Pasos

- [ ] **Paso 1: tests que fallan**

`features/operacion/salud.test.ts`:

```ts
import { describe, expect, it } from "vitest"

import { filasSalud, interpretarSalud } from "./salud"

const caido = {
  status: "DOWN",
  checks: [
    { name: "Database connections health check", status: "UP", data: { "<default>": "UP" } },
    { name: "SmallRye Reactive Messaging - readiness check", status: "DOWN", data: { "ultima-posicion": "[OK]", "historial-telemetria": "[KO] - fallo de BD" } },
  ],
}

describe("interpretarSalud", () => {
  it("un 503 con cuerpo de SmallRye Health es DOWN con su detalle, no un error de red", () => {
    const s = interpretarSalud(503, caido)
    expect(s.status).toBe("DOWN")
    expect(s.error).toBeNull()
    expect(s.checks).toHaveLength(2)
  })
  it("un cuerpo que no es de salud se informa como error", () => {
    expect(interpretarSalud(502, "<html>Bad gateway</html>")).toEqual({ status: "DOWN", checks: [], error: "Respuesta inesperada (HTTP 502)" })
  })
})

describe("filasSalud", () => {
  it("abre cada canal de mensajería en su propia fila", () => {
    expect(filasSalud(interpretarSalud(503, caido))).toEqual([
      { nombre: "Base de datos", ok: true, detalle: "UP" },
      { nombre: "Canal ultima-posicion", ok: true, detalle: "[OK]" },
      { nombre: "Canal historial-telemetria", ok: false, detalle: "[KO] - fallo de BD" },
    ])
  })
})
```

`features/operacion/prometheus.test.ts`:

```ts
import { describe, expect, it } from "vitest"

import { parsearPrometheus, tasaPorSegundo, valor } from "./prometheus"

const TEXTO = `# HELP viajes_sin_cierre Viajes sin cierre
# TYPE viajes_sin_cierre gauge
viajes_sin_cierre 3.0
viajes_eventos_insertados_total 1200.0
kafka_consumer_fetch_manager_records_lag_max{client_id="kafka-consumer-ultima-posicion",kafka_version="4.2.1"} 0.0
kafka_consumer_fetch_manager_records_lag_max{client_id="kafka-consumer-historial-telemetria",kafka_version="4.2.1"} 12.0
autos_persistencia_fallos_total NaN
`

describe("parsearPrometheus", () => {
  const ms = parsearPrometheus(TEXTO)
  it("ignora comentarios y lee nombre, etiquetas y valor", () => {
    expect(ms).toHaveLength(5)
    expect(valor(ms, "viajes_sin_cierre")).toBe(3)
  })
  it("filtra por etiquetas", () => {
    expect(valor(ms, "kafka_consumer_fetch_manager_records_lag_max", { client_id: "kafka-consumer-historial-telemetria" })).toBe(12)
  })
  it("NaN o una métrica ausente dan null", () => {
    expect(valor(ms, "autos_persistencia_fallos_total")).toBeNull()
    expect(valor(ms, "no_existe")).toBeNull()
  })
})

describe("tasaPorSegundo", () => {
  it("diferencia de contador entre dos lecturas", () => expect(tasaPorSegundo(1_200, 1_215, 5_000)).toBe(3))
  it("sin lectura anterior, con reinicio del contador o sin tiempo no hay tasa", () => {
    expect(tasaPorSegundo(null, 10, 5_000)).toBeNull()
    expect(tasaPorSegundo(500, 10, 5_000)).toBeNull()
    expect(tasaPorSegundo(1, 2, 0)).toBeNull()
  })
})
```

- [ ] **Paso 2: ver que fallan**

Run: `npm test`
Esperado: FAIL, porque no se encuentran `./salud` ni `./prometheus`.

- [ ] **Paso 3: implementar `features/operacion/salud.ts`**

```ts
export type Check = { name: string; status: "UP" | "DOWN"; data?: Record<string, unknown> }
export type Salud = { status: "UP" | "DOWN"; checks: Check[]; error: string | null }
export type FilaSalud = { nombre: string; ok: boolean; detalle: string }

function esSalud(x: unknown): x is { status: "UP" | "DOWN"; checks: Check[] } {
  const o = x as { status?: unknown; checks?: unknown } | null
  return !!o && (o.status === "UP" || o.status === "DOWN") && Array.isArray(o.checks)
}

/** SmallRye Health responde 200 (UP) o 503 (DOWN) con el mismo cuerpo; cualquier otra cosa es un error. */
export function interpretarSalud(httpStatus: number, cuerpo: unknown): Salud {
  if (esSalud(cuerpo)) return { status: cuerpo.status, checks: cuerpo.checks, error: null }
  return { status: "DOWN", checks: [], error: `Respuesta inesperada (HTTP ${httpStatus})` }
}

/** Una fila por check; el de mensajería se abre en una fila por canal. */
export function filasSalud(s: Salud): FilaSalud[] {
  return s.checks.flatMap((c): FilaSalud[] => {
    if (c.name.includes("Messaging") && c.data) {
      return Object.entries(c.data).map(([canal, d]) => ({ nombre: `Canal ${canal}`, ok: String(d).startsWith("[OK]"), detalle: String(d) }))
    }
    const nombre = c.name.startsWith("Database") ? "Base de datos" : c.name
    return [{ nombre, ok: c.status === "UP", detalle: c.status }]
  })
}
```

- [ ] **Paso 4: implementar `features/operacion/prometheus.ts`**

```ts
export type MuestraProm = { nombre: string; etiquetas: Record<string, string>; valor: number }

const LINEA = /^([a-zA-Z_:][a-zA-Z0-9_:]*)(?:\{(.*)\})?\s+(\S+)/
const ETIQUETA = /([a-zA-Z_][a-zA-Z0-9_]*)="((?:[^"\\]|\\.)*)"/g

/** Formato de texto de Prometheus: se ignoran comentarios y líneas vacías. */
export function parsearPrometheus(texto: string): MuestraProm[] {
  const muestras: MuestraProm[] = []
  for (const linea of texto.split("\n")) {
    if (!linea || linea.startsWith("#")) continue
    const m = LINEA.exec(linea)
    if (!m) continue
    const etiquetas: Record<string, string> = {}
    for (const [, k, v] of (m[2] ?? "").matchAll(ETIQUETA)) etiquetas[k] = v
    muestras.push({ nombre: m[1], etiquetas, valor: Number(m[3]) })
  }
  return muestras
}

/** Primer valor de la métrica que tenga esas etiquetas; null si no está o es NaN. */
export function valor(ms: MuestraProm[], nombre: string, etiquetas: Record<string, string> = {}): number | null {
  const m = ms.find((x) => x.nombre === nombre && Object.entries(etiquetas).every(([k, v]) => x.etiquetas[k] === v))
  return m && Number.isFinite(m.valor) ? m.valor : null
}

/** Eventos por segundo entre dos lecturas de un contador; null si no se puede calcular o el contador se reinició. */
export function tasaPorSegundo(anterior: number | null, actual: number | null, dtMs: number): number | null {
  if (anterior === null || actual === null || dtMs <= 0 || actual < anterior) return null
  return ((actual - anterior) / dtMs) * 1_000
}
```

- [ ] **Paso 5: ver que pasan**

Run: `npm test`
Esperado: PASS.

- [ ] **Paso 6: cliente `features/operacion/api.ts`**

```ts
import { http } from "@/lib/http"

import { parsearPrometheus, type MuestraProm } from "./prometheus"
import { interpretarSalud, type Salud } from "./salud"

/** 503 es una respuesta válida de readiness (DOWN): axios no debe convertirla en excepción. */
export async function obtenerSalud(): Promise<Salud> {
  const r = await http.get<unknown>("/q/health/ready", { validateStatus: (s) => s === 200 || s === 503 })
  return interpretarSalud(r.status, r.data)
}

export async function obtenerMetricas(): Promise<MuestraProm[]> {
  const { data } = await http.get<string>("/q/metrics", { responseType: "text", headers: { Accept: "text/plain" } })
  return parsearPrometheus(data)
}
```

- [ ] **Paso 7: pantalla `features/operacion/components/operacion-pantalla.tsx`**

```tsx
"use client"

import { CheckmarkFilled, ErrorFilled, Launch } from "@carbon/icons-react"
import { InlineNotification, Tag } from "@carbon/react"
import { useEffect, useRef, useState } from "react"

import { Encabezado } from "@/components/encabezado"

import { obtenerMetricas, obtenerSalud } from "../api"
import { type MuestraProm, tasaPorSegundo, valor } from "../prometheus"
import { filasSalud, type Salud } from "../salud"

const REFRESCO_MS = 5_000
const API = process.env.NEXT_PUBLIC_API_URL ?? ""
const FLINK_UI = process.env.NEXT_PUBLIC_FLINK_UI_URL ?? "http://localhost:8081"
const CANALES = ["ultima-posicion", "historial-telemetria"] as const
const LAG = "kafka_consumer_fetch_manager_records_lag_max"
const FLUJO = [
  ["Productor", "Simulación", "timer Vert.x 1 s"],
  ["Topic", "telemetria", "12 part. · key=carId"],
  ["Job", "Flink 2.2.1", "keyBy(carId) · ValueState"],
  ["Topic", "ultima-posicion", "compact"],
  ["Consumidor", "Autos", "tb_ultima_posicion"],
  ["Salida", "WebSocket", "/ws/autos · 500 ms"],
] as const
const num = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 1 })
const fmt = (n: number | null) => (n === null ? "—" : num.format(n))

/** Salud, flujo y métricas de la API (runbook: docs/test-cases/persistencia-posiciones-viajes.md). */
export function OperacionPantalla() {
  const [salud, setSalud] = useState<Salud | null>(null)
  const [metricas, setMetricas] = useState<MuestraProm[]>([])
  const [eventosPorSeg, setEventosPorSeg] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const anterior = useRef<{ valor: number | null; ms: number } | null>(null)

  useEffect(() => {
    let vigente = true
    const leer = async () => {
      try {
        const [s, m] = await Promise.all([obtenerSalud(), obtenerMetricas()])
        if (!vigente) return
        const ahora = Date.now()
        const insertados = valor(m, "viajes_eventos_insertados_total")
        setEventosPorSeg(anterior.current ? tasaPorSegundo(anterior.current.valor, insertados, ahora - anterior.current.ms) : null)
        anterior.current = { valor: insertados, ms: ahora }
        setSalud(s)
        setMetricas(m)
        setError(null)
      } catch (e) {
        if (vigente) setError(e instanceof Error ? e.message : "Error desconocido")
      }
    }
    void leer()
    const id = setInterval(leer, REFRESCO_MS)
    return () => {
      vigente = false
      clearInterval(id)
    }
  }, [])

  const fallos = [valor(metricas, "viajes_persistencia_fallos_total"), valor(metricas, "autos_persistencia_fallos_total")]
  const indicadores = [
    ["Eventos por segundo", fmt(eventosPorSeg)],
    ["Viajes sin cierre", fmt(valor(metricas, "viajes_sin_cierre"))],
    ["Duplicados ignorados", fmt(valor(metricas, "viajes_eventos_duplicados_total"))],
    ["Eventos inválidos", fmt(valor(metricas, "viajes_eventos_invalidos_total"))],
    ["Lotes revertidos", fallos.every((f) => f === null) ? "—" : fmt(fallos.reduce<number>((a, f) => a + (f ?? 0), 0))],
  ] as const

  return (
    <>
      <Encabezado />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-[1312px] flex-col gap-8 px-6 pt-8 pb-12">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h1 className="text-[28px] leading-9 font-normal">Operación</h1>
              <p className="text-muted-foreground">Salud de la API, del job de Flink y de los consumidores que guardan en PostgreSQL.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a href={`${API}/q/health/ready`} target="_blank" rel="noreferrer" className="flex h-10 items-center rounded-full border border-input px-4 font-mono text-xs text-foreground no-underline">/q/health/ready</a>
              <a href={`${API}/q/metrics`} target="_blank" rel="noreferrer" className="flex h-10 items-center rounded-full border border-input px-4 font-mono text-xs text-foreground no-underline">/q/metrics</a>
              <a href={FLINK_UI} target="_blank" rel="noreferrer" className="flex h-10 items-center gap-2 rounded-full bg-primary px-5 text-primary-foreground no-underline">
                Abrir Flink UI <Launch size={16} />
              </a>
            </div>
          </div>

          <InlineNotification kind="info" lowContrast hideCloseButton title="Si un consumidor JDBC falla," subtitle="su canal se detiene y la readiness pasa a DOWN. Se recupera reiniciando la API: el eventId hace idempotente la reentrega." />
          {error && <InlineNotification kind="error" lowContrast hideCloseButton title="No se pudo leer la API" subtitle={error} />}

          <section aria-labelledby="t-salud" className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <h2 id="t-salud" className="text-xl font-normal">Salud</h2>
              {salud && <Tag type={salud.status === "UP" ? "green" : "red"} size="sm">Readiness {salud.status}</Tag>}
            </div>
            {salud?.error && <p className="text-error-text">{salud.error}</p>}
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
              {(salud ? filasSalud(salud) : []).map((f) => (
                <li key={f.nombre} className="flex flex-col gap-2 rounded-lg border bg-card p-4">
                  <span className="text-xs text-muted-foreground">{f.nombre}</span>
                  <span className="flex items-center gap-2 text-xl">
                    {f.ok ? <CheckmarkFilled size={20} className="fill-success" /> : <ErrorFilled size={20} className="fill-destructive" />}
                    {f.ok ? "UP" : "DOWN"}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">{f.detalle}</span>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="t-flujo" className="flex flex-col gap-4">
            <h2 id="t-flujo" className="text-xl font-normal">Flujo de eventos</h2>
            <div className="overflow-x-auto rounded-lg border bg-muted p-6">
              <ol aria-label="Camino de la última posición" className="flex min-w-[980px] items-stretch gap-2">
                {FLUJO.map(([tipo, nombre, detalle], i) => (
                  <li key={nombre} className="flex flex-1 items-center gap-2">
                    <div className="flex min-h-[92px] flex-1 flex-col gap-1.5 rounded-lg border bg-card p-3">
                      <Tag size="sm" type="gray" className="self-start">{tipo}</Tag>
                      <span className="font-semibold">{nombre}</span>
                      <span className="font-mono text-xs text-muted-foreground">{detalle}</span>
                    </div>
                    {i < FLUJO.length - 1 && <span aria-hidden className="text-muted-foreground">→</span>}
                  </li>
                ))}
              </ol>
              <p className="mt-4 text-xs text-muted-foreground">
                El consumidor de <strong>Viajes</strong> lee <code>telemetria</code> directamente y guarda en <code>tb_viaje</code> y <code>tb_posicion_historial</code>, incluidas las muestras atrasadas que Flink descarta.
              </p>
            </div>
          </section>

          <section aria-labelledby="t-metricas" className="flex flex-col gap-4">
            <h2 id="t-metricas" className="text-xl font-normal">Métricas</h2>
            <dl className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
              {indicadores.map(([dt, dd]) => (
                <div key={dt} className="flex flex-col gap-1 rounded-lg border bg-card p-4">
                  <dt className="text-xs text-muted-foreground">{dt}</dt>
                  <dd className="font-mono text-[28px] leading-9">{dd}</dd>
                </div>
              ))}
            </dl>
            <div className="overflow-x-auto rounded-lg border bg-card">
              <table className="w-full min-w-[560px] border-collapse">
                <thead>
                  <tr className="h-10 bg-muted text-left text-xs text-muted-foreground">
                    <th scope="col" className="px-4 font-semibold">Canal</th>
                    <th scope="col" className="px-4 text-right font-semibold">Lag máximo</th>
                  </tr>
                </thead>
                <tbody>
                  {CANALES.map((c) => (
                    <tr key={c} className="h-12 border-t">
                      <td className="px-4 font-mono text-sm">{c}</td>
                      <td className="px-4 text-right font-mono text-sm">{fmt(valor(metricas, LAG, { client_id: `kafka-consumer-${c}` }))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </>
  )
}
```

`fill-success` y `fill-destructive` existen porque `--color-success` y `--color-destructive` ya están en `@theme inline`.

- [ ] **Paso 8: exportar, ruta, sección y variable de entorno**

- `features/operacion/index.ts`:
  ```ts
  // API pública de la feature (STD-ARCH-001): app/ solo importa desde aquí.
  export { OperacionPantalla } from "./components/operacion-pantalla"
  ```
- `app/operacion/page.tsx`: igual que `app/viajes/page.tsx`, pero importando `OperacionPantalla` de `@/features/operacion`.
- `lib/secciones.ts`: Operación pasa a `disponible: true`.
- Busca dónde se documentan `NEXT_PUBLIC_API_URL` y `NEXT_PUBLIC_WS_URL`: `grep -rn "NEXT_PUBLIC_WS_URL" --include=*.example --include=*.yml --include=Dockerfile --include=*.md . | grep -v node_modules`. Agrega `NEXT_PUBLIC_FLINK_UI_URL=http://localhost:8081` en los mismos lugares: `.env.example`, `args` del servicio `dashboard` en `docker-compose.yml` y `ARG`/`ENV` del `Dockerfile` del dashboard.

- [ ] **Paso 9: verificar**

```bash
npm test && npm run lint && npm run build
```

Esperado: todo en verde.

Con la API arriba, en http://localhost:3000/operacion:
- *Operación* aparece activa;
- se ven "Readiness UP", Base de datos y los canales en verde;
- después de 5 s, "Eventos por segundo" muestra un número durante una carrera (≈ 3);
- el lag de cada canal es un número;
- **Review Focus 4:** detén PostgreSQL (`docker compose stop postgres`). En unos 10 s aparece "Readiness DOWN" con la base en rojo, sin el error "No se pudo leer la API". Después ejecuta `docker compose start postgres`.

- [ ] **Paso 10: commit**

```bash
git add dashboard-next/features/operacion dashboard-next/app/operacion dashboard-next/lib/secciones.ts
git add <archivos de entorno modificados en el paso 8>
git commit -m "feat(dashboard): pantalla Operación con salud, flujo y métricas de la API

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
