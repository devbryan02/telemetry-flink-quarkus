# UI Carbon · Opción A (shell clásico) — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** llevar al dashboard Next.js el diseño "A · Shell clásico" inspirado en Carbon: cabecera de 48 px, panel lateral fijo por secciones y un mapa más legible (ruta en dos tramos, salida/meta, autos con color propio, leyenda y controles).

**Architecture:** el cambio vive solo en `dashboard-next/`. El backend no cambia. Los colores de Carbon entran como tokens de shadcn en `globals.css` (G10 claro / G100 oscuro), así los componentes siguen usando `bg-card`, `text-muted-foreground`, etc. La lógica nueva (color por auto, cronómetro, división de la ruta en recorrido/pendiente, propiedades GeoJSON) va en funciones puras de `features/autos/*.ts` con tests de Vitest. Los componentes se reorganizan sin tocar el flujo de datos: el estado de los autos sigue en `useRef` y se pinta con `setData()` (spec RF-U9/RF-U10).

**Tech Stack:** Next.js 16.4, React 19.3, shadcn/ui (base-ui), mapcn + MapLibre 6, Tailwind 4, next-themes, Vitest (nuevo, dev).

**Spec:** `docs/specs/telemetria.md` §10 (RF-U1…RF-U12) + el diseño aprobado, artboard **A · Shell clásico** de https://claude.ai/artifact/635QQXLknMH2hphfxrMrC7 (`project/Main.dc.html`).

## Context

El usuario eligió la opción A de las tres alternativas Carbon y pidió mejorar su mapa. Este plan la implementa en incrementos pequeños, cada uno con lint + build (+ tests cuando hay lógica) y un commit. Decisiones tomadas con el usuario:
- **Marcadores:** color por auto (paleta categórica de Carbon) + número + flecha de rumbo; con motor **OFF** (llegó) el marcador se ve **gris**. Se actualiza la spec RF-U8.
- **Tests:** se agrega **Vitest** solo para funciones puras.
- **Navegación:** pestañas Carrera (activa) y **Viajes / Operación deshabilitadas**.
- **Fuera de alcance:** selector Calles/Satélite (no hay mapa satelital libre sin API key), vistas Viajes y Operación, cambios de backend.

## Global Constraints

- Todo en español (código, comentarios, commits, docs), como el resto del repo.
- Organización por features (STD-ARCH-001): lo nuevo de la carrera va en `features/autos/`; `app/` solo importa de `features/autos/index.ts`. Componentes compartidos de layout en `components/`.
- Colores siempre por token (`bg-card`, `text-foreground`, `var(--…)`), nunca hex en clases de Tailwind. MapLibre necesita colores concretos: se leen de las variables CSS al crear la capa.
- No editar `components/ui/**` (generado por la CLI de shadcn/mapcn).
- Sin emojis en la UI (🏁 se reemplaza por íconos de `lucide-react`).
- Contraste ≥ 4.5:1 para texto; los tres colores de auto se distinguen también por luminosidad.
- Git (STD-GIT-001): rama única `feature/inc-22-ui-carbon` desde `develop`; un commit Conventional Commits por incremento; sin PR. Terminar cada commit con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Verificación base de cada incremento: `cd dashboard-next && npm test && npm run lint && npm run build`.
- Docker: tras terminar, `docker compose up -d --build dashboard`. Nunca `down -v`.

## Review Focus

1. **Cambio de tema en plena carrera:** al pasar de claro a oscuro, MapLibre recarga el estilo y borra fuentes, capas e íconos; la ruta en dos tramos, los íconos por color, la etiqueta del líder y la escala deben volver a aparecer con los colores del tema nuevo. (Incrementos 07 y 09: las capas se crean en el efecto que depende de `isLoaded` y leen los tokens en ese momento.)
2. **IDs de auto que no siguen `auto-N`** (eventos legados o particulares): el color no puede salir `undefined`; se usa un índice estable por hash. → test en Task 5.
3. **Ruta elegida distinta de la carrera en curso** (`simulacion.ruta !== rutaSeleccionada`): el tramo recorrido debe ser 0 y la ruta entera "pendiente". → test de `fraccionLider` en Task 7.
4. **Extremos de la división de la ruta:** fracción 0, 1, >1, negativa y ruta de 325 km (Vía Los Libertadores) con muchos puntos. → tests de `dividirRuta` en Task 7.
5. **Ancho de celular:** el panel se apila sobre el mapa; el mapa debe conservar altura (`min-h-[60dvh]`) y no quedar en 0 px. → paso de verificación en Task 3.

## Archivos

| Archivo | Responsabilidad |
|---|---|
| `dashboard-next/vitest.config.ts` (nuevo) | Vitest en entorno node con alias `@` |
| `features/autos/formato.ts` (nuevo) | `km`, `segundos`, `cronometro`, `tiempoCarrera` |
| `features/autos/paleta.ts` (nuevo) | `indiceColor(carId)` y paletas por tema |
| `features/autos/distancia.ts` (nuevo) | `metros(a, b)` extraído de `animacion.ts` |
| `features/autos/ruta-progreso.ts` (nuevo) | `dividirRuta`, `fraccionLider` |
| `features/autos/tokens.ts` (nuevo) | `leerToken(nombre)` lee una variable CSS para MapLibre |
| `components/encabezado.tsx` (nuevo) | Cabecera 48 px: nombre, pestañas, conexión, tema |
| `features/autos/components/fila-corredor.tsx` (nuevo) | Fila de clasificación (extraída del panel) |
| `features/autos/components/metricas-tiles.tsx` (nuevo) | Tres indicadores en grilla |
| `features/autos/components/controles-mapa.tsx` (nuevo) | Zoom, encuadrar ruta, norte, escala, coordenadas |
| `features/autos/components/leyenda.tsx` (nuevo) | Leyenda de autos y tramos |
| `features/autos/components/carrera-panel.tsx` | Panel lateral por secciones |
| `features/autos/components/autos-map.tsx` | Layout shell: cabecera + aside + mapa |
| `features/autos/components/ruta-layer.tsx` | Casing + tramo pendiente + tramo recorrido |
| `features/autos/components/salida-meta.tsx` | Marcadores Carbon sin emoji |
| `features/autos/components/autos-layer.tsx`, `vehiculo.ts`, `geojson.ts` | Íconos por color/motor, número, etiqueta del líder |
| `app/globals.css`, `app/layout.tsx` | Tokens Carbon, IBM Plex Sans/Mono |
| `docs/specs/telemetria.md`, `CLAUDE.md`, `docs/plans/…` | Documentación |

---

### Task 1: Rama, plan versionado, Vitest y `formato.ts`

**Files:**
- Create: `docs/plans/ui-carbon/README.md` (este plan) y fila nueva en `docs/plans/README.md`
- Create: `dashboard-next/vitest.config.ts`, `dashboard-next/features/autos/formato.ts`, `dashboard-next/features/autos/formato.test.ts`
- Modify: `dashboard-next/package.json` (script `test`, devDependency `vitest`), `features/autos/components/carrera-panel.tsx` (importar de `formato.ts`)

**Interfaces:**
- Produces: `km: Intl.NumberFormat`, `segundos(ms: number | null): string`, `cronometro(ms: number): string`, `tiempoCarrera(inicioIso: string | null, ahoraMs: number): number | null`

- [x] **Step 1: Rama y plan**
```bash
git switch develop && git switch -c feature/inc-22-ui-carbon
mkdir -p docs/plans/ui-carbon   # copiar este plan como README.md
```
En `docs/plans/README.md`, agregar a la tabla: `| UI Carbon · opción A | [Plan](ui-carbon/README.md) | [Telemetría §10](../specs/telemetria.md) |`.

- [x] **Step 2: Instalar Vitest**
```bash
cd dashboard-next && npm install -D vitest
```
`package.json` → `"scripts": { ..., "test": "vitest run" }`.

`vitest.config.ts`:
```ts
import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

// Solo funciones puras de features/*: la UI se verifica con lint, build y el navegador.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./", import.meta.url)) } },
  test: { environment: "node", include: ["features/**/*.test.ts"] },
})
```

- [x] **Step 3: Test que falla** — `features/autos/formato.test.ts`
```ts
import { describe, expect, it } from "vitest"

import { cronometro, segundos, tiempoCarrera } from "./formato"

describe("cronometro", () => {
  it("formatea minutos con décima y coma", () => expect(cronometro(37_612)).toBe("0:37,6"))
  it("agrega horas cuando pasa de 60 min", () => expect(cronometro(3_723_400)).toBe("1:02:03,4"))
})

describe("segundos", () => {
  it("muestra guion sin dato", () => expect(segundos(null)).toBe("—"))
  it("una décima con coma", () => expect(segundos(812)).toBe("0,8 s"))
})

describe("tiempoCarrera", () => {
  it("null sin inicio", () => expect(tiempoCarrera(null, 0)).toBeNull())
  it("ms desde el inicio", () =>
    expect(tiempoCarrera("2026-10-21T02:42:27.000Z", Date.parse("2026-10-21T02:44:01.500Z"))).toBe(94_500))
  it("nunca negativo (reloj del navegador atrasado)", () =>
    expect(tiempoCarrera("2026-10-21T02:42:27.000Z", Date.parse("2026-10-21T02:42:26.000Z"))).toBe(0))
})
```

- [x] **Step 4: Ver que falla** — `npm test` → FAIL "Cannot find module './formato'".

- [x] **Step 5: Implementar** — `features/autos/formato.ts` (mueve `km`, `segundos` y `cronometro` desde `carrera-panel.tsx`; `segundos` pasa a usar coma decimal, como la UI de Carbon en es-PE):
```ts
export const km = new Intl.NumberFormat("es-PE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })

const decima = new Intl.NumberFormat("es-PE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })

/** 812 → "0,8 s"; null → "—" */
export function segundos(ms: number | null): string {
  return ms === null ? "—" : `${decima.format(ms / 1000)} s`
}

/** 37612 → "0:37,6"; 3723400 → "1:02:03,4" */
export function cronometro(ms: number): string {
  const total = ms / 1000
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = (total % 60).toFixed(1).replace(".", ",").padStart(4, "0")
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`
}

/** Tiempo transcurrido desde `inicio` (ISO-8601 del backend), o null si la carrera no empezó. */
export function tiempoCarrera(inicioIso: string | null, ahoraMs: number): number | null {
  if (!inicioIso) return null
  return Math.max(0, ahoraMs - Date.parse(inicioIso))
}
```
En `carrera-panel.tsx`, borrar las definiciones locales e `import { cronometro, km, segundos } from "../formato"`.

- [x] **Step 6: Verificar** — `npm test && npm run lint && npm run build` → todo PASS.

- [x] **Step 7: Commit**
```bash
git add docs/plans dashboard-next/package.json dashboard-next/package-lock.json dashboard-next/vitest.config.ts dashboard-next/features/autos/formato.ts dashboard-next/features/autos/formato.test.ts dashboard-next/features/autos/components/carrera-panel.tsx
git commit -m "test(dashboard): agregar Vitest y extraer formatos de la carrera"
```

---

### Task 2: Tokens Carbon y tipografía IBM Plex

**Files:**
- Modify: `dashboard-next/app/globals.css` (`:root`, `.dark`, `@theme inline`), `dashboard-next/app/layout.tsx`

**Interfaces:**
- Produces (variables CSS usadas por tareas siguientes): `--header`, `--header-foreground`, `--header-border`, `--field`, `--success`, `--error-text`, `--ruta-recorrido`, `--ruta-pendiente`, `--ruta-borde`, `--auto-1`, `--auto-2`, `--auto-3`, `--auto-off`; utilidades Tailwind `bg-header`, `text-header-foreground`, `bg-field`, `text-success`, `text-error-text`.

- [x] **Step 1: Fuentes** — en `layout.tsx` reemplazar Geist por:
```ts
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google"

const plexSans = IBM_Plex_Sans({ variable: "--font-plex-sans", subsets: ["latin"], weight: ["400", "500", "600"] })
const plexMono = IBM_Plex_Mono({ variable: "--font-plex-mono", subsets: ["latin"], weight: ["400", "500"] })
```
y `className={`${plexSans.variable} ${plexMono.variable} h-full antialiased`}`. En `@theme inline`: `--font-sans: var(--font-plex-sans); --font-mono: var(--font-plex-mono);`.

- [x] **Step 2: Tokens** — en `globals.css`, reemplazar los valores de `:root` (Carbon G10) y `.dark` (Carbon G100). Valores exactos:

| Token | `:root` (G10) | `.dark` (G100) |
|---|---|---|
| `--background` | `#f4f4f4` | `#161616` |
| `--foreground` | `#161616` | `#f4f4f4` |
| `--card` / `--popover` | `#ffffff` | `#262626` |
| `--card-foreground` / `--popover-foreground` | `#161616` | `#f4f4f4` |
| `--primary` / `--primary-foreground` | `#0f62fe` / `#ffffff` | `#0f62fe` / `#ffffff` |
| `--secondary` / `--secondary-foreground` | `#edf5ff` / `#0f62fe` | `#393939` / `#f4f4f4` |
| `--muted` | `#e0e0e0` | `#393939` |
| `--muted-foreground` | `#525252` | `#c6c6c6` |
| `--accent` / `--accent-foreground` | `#e8e8e8` / `#161616` | `#333333` / `#f4f4f4` |
| `--destructive` | `#da1e28` | `#da1e28` |
| `--border` | `#e0e0e0` | `#393939` |
| `--input` | `#8d8d8d` | `#6f6f6f` |
| `--ring` | `#0f62fe` | `#ffffff` |
| `--radius` | `0rem` | (hereda) |
| `--header` / `--header-foreground` / `--header-border` | `#161616` / `#f4f4f4` / `#393939` | `#161616` / `#f4f4f4` / `#393939` |
| `--field` | `#f4f4f4` | `#393939` |
| `--success` | `#198038` | `#42be65` |
| `--error-text` | `#da1e28` | `#ff8389` |
| `--ruta-recorrido` / `--ruta-pendiente` / `--ruta-borde` | `#0f62fe` / `#a6c8ff` / `#ffffff` | `#78a9ff` / `#002d9c` / `#161616` |
| `--auto-1` / `--auto-2` / `--auto-3` | `#6929c4` / `#1192e8` / `#b28600` | `#a56eff` / `#33b1ff` / `#f1c21b` |
| `--auto-off` | `#8d8d8d` | `#6f6f6f` |

En `@theme inline` agregar `--color-header: var(--header); --color-header-foreground: var(--header-foreground); --color-header-border: var(--header-border); --color-field: var(--field); --color-success: var(--success); --color-error-text: var(--error-text);`. Los `--sidebar-*` y `--chart-*` se dejan.

- [x] **Step 3: Verificar** — `npm test && npm run lint && npm run build`; `npm run dev` y abrir http://localhost:3000: el panel actual se ve con esquinas rectas, IBM Plex y botón azul `#0f62fe`, en claro y oscuro. Revisar con el selector de tema.

- [x] **Step 4: Commit** — `git commit -m "feat(dashboard): tokens de Carbon G10/G100 y tipografía IBM Plex"`

---

### Task 3: Shell — cabecera de 48 px y panel lateral fijo

**Files:**
- Create: `dashboard-next/components/encabezado.tsx`
- Modify: `features/autos/components/autos-map.tsx` (layout y `fitBounds`), `features/autos/components/carrera-panel.tsx` (sin `Card` flotante, sin badge ni selector de tema)

**Interfaces:**
- Consumes: `EstadoConexion` de `features/autos/hooks/use-autos-socket.ts`; `SelectorTema` de `components/selector-tema.tsx`.
- Produces: `Encabezado({ conexion }: { conexion: "conectando" | "abierta" | "reconectando" })`. Para no hacer que `components/` dependa de una feature, el tipo se declara en el componente como unión literal.

- [x] **Step 1: `components/encabezado.tsx`**
```tsx
import { SelectorTema } from "@/components/selector-tema"
import { cn } from "@/lib/utils"

type Conexion = "conectando" | "abierta" | "reconectando"

const ETIQUETA: Record<Conexion, string> = { conectando: "Conectando", abierta: "En vivo", reconectando: "Reconectando" }
const PESTANAS = [
  { nombre: "Carrera", activa: true },
  { nombre: "Viajes", activa: false },
  { nombre: "Operación", activa: false },
] as const

/** Cabecera tipo UI Shell de Carbon: nombre, secciones, estado del WebSocket y tema. */
export function Encabezado({ conexion }: { conexion: Conexion }) {
  const enVivo = conexion === "abierta"
  return (
    <header className="flex h-12 shrink-0 items-center border-b border-header-border bg-header text-header-foreground">
      <span className="px-4 text-sm">
        Telemetría <span className="font-semibold">[Carrera]</span>
      </span>
      <nav aria-label="Secciones" className="flex h-12 border-l border-header-border">
        {PESTANAS.map((p) =>
          p.activa ? (
            <span key={p.nombre} aria-current="page" className="flex items-center bg-white/10 px-4 text-sm shadow-[inset_0_-3px_0_var(--primary)]">
              {p.nombre}
            </span>
          ) : (
            <button key={p.nombre} type="button" disabled title="Próximamente" className="px-4 text-sm text-header-foreground/50">
              {p.nombre}
            </button>
          ),
        )}
      </nav>
      <div className="ml-auto flex items-center gap-2 pr-2">
        <span
          role="status"
          className={cn(
            "inline-flex h-6 items-center gap-1.5 rounded-full px-2 text-xs",
            enVivo ? "bg-[#044317] text-[#a7f0ba]" : "bg-[#750e13] text-[#ffd7d9]",
          )}
        >
          <span className={cn("size-2 rounded-full", enVivo ? "bg-[#42be65]" : "bg-[#fa4d56]")} />
          {ETIQUETA[conexion]}
        </span>
        <SelectorTema className="border-header-border" />
      </div>
    </header>
  )
}
```
(Los colores del tag son fijos porque la cabecera es G100 en ambos temas; es la única excepción a "solo tokens", documentada con un comentario.)

- [x] **Step 2: Layout en `autos-map.tsx`** — reemplazar el `return` por:
```tsx
<div className="flex h-full flex-col">
  <Encabezado conexion={conexion} />
  <div className="flex min-h-0 flex-1 flex-wrap">
    <aside aria-label="Control de la carrera" className="flex max-h-full min-w-0 flex-[1_1_340px] flex-col overflow-y-auto border-r bg-card sm:max-w-[400px]">
      <PanelVivo {...mismasProps} />
    </aside>
    <div className="relative min-h-[60dvh] min-w-0 flex-[999_1_560px]">
      <Map ref={mapa} center={LIMA} zoom={11}>
        <RutaLayer ruta={geometria} />
        <SalidaMeta ruta={geometria} />
        <AutosLayer ref={capa} filtro={filtro} />
      </Map>
    </div>
  </div>
</div>
```
Y en `fitBounds` usar `padding: 60` (el panel ya no tapa el mapa).

- [x] **Step 3: `carrera-panel.tsx`** — quitar `Card`/`CardHeader`, el `Badge` de conexión y `SelectorTema`; el contenido queda en `<div className="flex flex-col">` con el mismo orden actual. Quitar `conexion` de sus props y de `PropsPanel`.

- [x] **Step 4: Verificar** — `npm test && npm run lint && npm run build`. En `npm run dev` (con la API en Docker):
  - cabecera oscura en claro y oscuro; Viajes/Operación deshabilitadas;
  - con la API detenida (`docker stop telemetria-api`) el tag pasa a "Reconectando" en rojo; al iniciarla vuelve a "En vivo";
  - en DevTools a 390 px de ancho, el panel queda arriba y el mapa debajo con altura visible (≥ 60 % de la pantalla);
  - al cambiar de ruta, la ruta queda centrada (sin el hueco de 360 px a la izquierda).

- [x] **Step 5: Commit** — `git commit -m "feat(dashboard): cabecera tipo UI Shell y panel lateral fijo"`

---

### Task 4: Panel — encabezado de carrera, ruta y acciones

**Files:**
- Modify: `features/autos/components/carrera-panel.tsx`

**Interfaces:**
- Consumes: `km` de `formato.ts`; íconos `Play`, `Square`, `RotateCcw`, `LocateFixed` de `lucide-react`.

- [x] **Step 1: Sección superior** — primera sección del panel (`p-4 pt-6 flex flex-col gap-4 border-b`):
  - `<h1 className="text-xl font-normal">Carrera en {ruta?.nombre ?? "—"}</h1>` y debajo `<p className="text-xs text-muted-foreground">{ruta.desde} → {ruta.hasta} · {km.format(ruta.km)} km</p>`;
  - el `Selector` de ruta con `<label>` visible "Ruta" encima (`text-xs text-muted-foreground`), trigger `h-10 bg-field border-0 border-b border-input`; si `enCurso`, texto de ayuda "No se puede cambiar con la carrera en curso".
- [x] **Step 2: Acciones** — fila `flex gap-px`:
  - botón principal `h-12 flex-1 justify-between px-4 text-left` con ícono a la derecha: `Play` + "Iniciar carrera", `RotateCcw` + "Nueva carrera", o `variant="destructive"` con `Square` + "Detener" (misma lógica de estado que hoy, RF-U3);
  - "Seguir líder" con `LocateFixed`, `aria-pressed`, `h-12`, `variant={seguirLider ? "secondary" : "outline"}`.
  - Reemplazar "Carrera terminada 🏁" por `<p className="text-xs font-medium text-success">Carrera terminada</p>` con ícono `Flag`.
- [x] **Step 3: Verificar** — lint + build; en el navegador: los tres estados del botón (antes, durante y después de una carrera), el select deshabilitado durante la carrera y el texto de ayuda; navegación con Tab con foco visible azul.
- [x] **Step 4: Commit** — `git commit -m "feat(dashboard): encabezado de carrera, ruta y acciones al estilo Carbon"`

---

### Task 5: Clasificación con color por auto y cronómetro

**Files:**
- Create: `features/autos/paleta.ts`, `features/autos/paleta.test.ts`, `features/autos/components/fila-corredor.tsx`
- Modify: `features/autos/components/carrera-panel.tsx`

**Interfaces:**
- Produces: `CANTIDAD_COLORES = 3`; `indiceColor(carId: string): 1 | 2 | 3`; `varColor(carId: string): string` (devuelve `"var(--auto-N)"`).
- Consumes: `cronometro`, `tiempoCarrera`, `km` de `formato.ts`.

- [x] **Step 1: Test que falla** — `paleta.test.ts`
```ts
import { describe, expect, it } from "vitest"

import { indiceColor, varColor } from "./paleta"

describe("indiceColor", () => {
  it("usa el número de auto-N", () => {
    expect(indiceColor("auto-1")).toBe(1)
    expect(indiceColor("auto-2")).toBe(2)
    expect(indiceColor("auto-3")).toBe(3)
  })
  it("vuelve a empezar después del 3", () => expect(indiceColor("auto-4")).toBe(1))
  it("ids sin número dan un índice estable entre 1 y 3", () => {
    const i = indiceColor("car-xyz")
    expect([1, 2, 3]).toContain(i)
    expect(indiceColor("car-xyz")).toBe(i)
  })
})

describe("varColor", () => {
  it("referencia el token del tema", () => expect(varColor("auto-2")).toBe("var(--auto-2)"))
})
```
- [x] **Step 2: Ver que falla** — `npm test` → FAIL "Cannot find module './paleta'".
- [x] **Step 3: Implementar** — `paleta.ts`
```ts
/** Colores categóricos de Carbon por auto; los valores están en globals.css (`--auto-1..3`). */
export const CANTIDAD_COLORES = 3

export type IndiceColor = 1 | 2 | 3

/** `auto-N` → ((N-1) mod 3) + 1; cualquier otro id → hash estable, para que nunca quede sin color. */
export function indiceColor(carId: string): IndiceColor {
  const numero = /-(\d+)$/.exec(carId)
  const base = numero ? Number(numero[1]) - 1 : [...carId].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 0)
  return ((base % CANTIDAD_COLORES) + 1) as IndiceColor
}

export const varColor = (carId: string) => `var(--auto-${indiceColor(carId)})`
```
- [x] **Step 4: Ver que pasa** — `npm test` → PASS.
- [x] **Step 5: `fila-corredor.tsx`** — mover `FilaCorredor` desde el panel y rediseñarla (estructura del artboard A):
  - fila 1: posición en `font-mono` (`1º`), cuadrado `size-3` con `style={{ background: varColor(auto.carId) }}`, `carId` en `font-semibold` y debajo "Empresa · Flota" en `text-xs text-muted-foreground`; a la derecha `km` en `font-mono` o, si llegó, ícono `Flag` + `cronometro(llegadaMs)` en `text-success`;
  - fila 2: barra `role="progressbar"` con `aria-valuenow`, `h-1 bg-muted` y relleno `bg-primary` (`bg-success` al llegar);
  - fila 3: `<label>` "Velocidad", `Slider` (misma lógica de borrador/commit, RF-U5) y `{kmh} km/h` en `font-mono`.
  - `<li>` con `border-t px-4 py-3`, sin bordes redondeados.
- [x] **Step 6: Sección "Clasificación"** en el panel: `<h2 className="text-sm font-semibold">Clasificación</h2>` y a la derecha el cronómetro en `font-mono` cuando `enCurso`: `cronometro(tiempoCarrera(simulacion.inicio, Date.now()) ?? 0)`. Se refresca solo porque `PanelVivo` ya rerenderiza cada 1 s.
- [x] **Step 7: Verificar** — `npm test && npm run lint && npm run build`; en el navegador, iniciar una carrera: cada auto tiene su color, el cronómetro avanza, al llegar aparecen la bandera y el tiempo, y el slider sigue cambiando la velocidad.
- [x] **Step 8: Commit** — `git commit -m "feat(dashboard): clasificación con color por auto y cronómetro"`

---

### Task 6: Filtros y métricas en tiles

**Files:**
- Create: `features/autos/components/metricas-tiles.tsx`
- Modify: `features/autos/components/carrera-panel.tsx`

**Interfaces:**
- Consumes: `ResumenMetricas` (de `carrera-panel.tsx`), `segundos` de `formato.ts`.
- Produces: `MetricasTiles({ metricas }: { metricas: ResumenMetricas })`.

- [x] **Step 1: Filtros** — sección "Filtrar autos" (`p-4 border-b`): los dos `Selector` lado a lado (`flex flex-wrap gap-2`, cada uno `flex-[1_1_140px]`) con `<label>` visible "Empresa" y "Flota"; mismo comportamiento RF-U7.
- [x] **Step 2: `metricas-tiles.tsx`**
```tsx
import { segundos } from "../formato"
import type { ResumenMetricas } from "./carrera-panel"

/** Tres indicadores del flujo (RF-U11) en una grilla de tiles separados por 1 px. */
export function MetricasTiles({ metricas }: { metricas: ResumenMetricas }) {
  const tiles = [
    { etiqueta: "Mostrados", valor: `${metricas.mostrados}/${metricas.total}` },
    { etiqueta: "Último dato", valor: segundos(metricas.edadUltimoDatoMs) },
    { etiqueta: "Latencia p95", valor: segundos(metricas.latenciaP95Ms) },
  ]
  return (
    <dl aria-label="Métricas del flujo" className="grid grid-cols-3 gap-px border-b bg-border">
      {tiles.map((t) => (
        <div key={t.etiqueta} className="flex flex-col gap-1 bg-card px-4 py-3">
          <dt className="text-xs text-muted-foreground">{t.etiqueta}</dt>
          <dd className="font-mono text-xl tabular-nums">{t.valor}</dd>
        </div>
      ))}
    </dl>
  )
}
```
Reemplaza el `<dl>` actual; el error pasa a `<p role="alert" className="px-4 py-2 text-xs text-error-text">`.
- [x] **Step 3: Verificar** — lint + build; filtrar por Empresa 01 → "Mostrados 2/3" y el mapa solo muestra esos autos; Flota se habilita solo con empresa elegida.
- [x] **Step 4: Commit** — `git commit -m "feat(dashboard): filtros con etiqueta y métricas en tiles"`

---

### Task 7: Ruta en dos tramos (recorrido / pendiente)

**Files:**
- Create: `features/autos/distancia.ts`, `features/autos/ruta-progreso.ts`, `features/autos/ruta-progreso.test.ts`, `features/autos/tokens.ts`
- Modify: `features/autos/animacion.ts` (importa `metros`), `features/autos/components/ruta-layer.tsx`, `features/autos/components/autos-map.tsx`

**Interfaces:**
- Produces:
  - `metros(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number`
  - `type Coordenada = [number, number]` (`[lon, lat]`)
  - `dividirRuta(linea: Coordenada[], fraccion: number): { recorrido: Coordenada[]; pendiente: Coordenada[] }`
  - `fraccionLider(simulacion: EstadoSimulacion | null, rutaSeleccionada: string | null): number`
  - `leerToken(nombre: string, porDefecto: string): string`
  - `RutaLayer({ ruta, progreso }: { ruta: FeatureCollection<LineString> | null; progreso: number })`

- [x] **Step 1: Extraer `metros`** — mover la función de `animacion.ts` a `distancia.ts` con `export`, e importarla en `animacion.ts`. `npm test && npm run build` siguen PASS.
- [x] **Step 2: Test que falla** — `ruta-progreso.test.ts`
```ts
import { describe, expect, it } from "vitest"

import type { EstadoSimulacion } from "./types"
import { type Coordenada, dividirRuta, fraccionLider } from "./ruta-progreso"

// Tres puntos sobre el mismo meridiano: 0→1 y 1→2 miden lo mismo
const RECTA: Coordenada[] = [[-77, -12], [-77, -12.01], [-77, -12.02]]

describe("dividirRuta", () => {
  it("en 0 todo está pendiente", () => {
    const { recorrido, pendiente } = dividirRuta(RECTA, 0)
    expect(recorrido).toEqual([RECTA[0], RECTA[0]])
    expect(pendiente).toEqual(RECTA)
  })
  it("en 1 todo está recorrido", () => {
    const { recorrido, pendiente } = dividirRuta(RECTA, 1)
    expect(recorrido).toEqual(RECTA)
    expect(pendiente).toEqual([RECTA[2], RECTA[2]])
  })
  it("a la mitad corta en el punto medio y ambos tramos lo comparten", () => {
    const { recorrido, pendiente } = dividirRuta(RECTA, 0.5)
    expect(recorrido.at(-1)![1]).toBeCloseTo(-12.01, 6)
    expect(pendiente[0]).toEqual(recorrido.at(-1))
  })
  it("interpola dentro de un segmento", () => {
    const { recorrido } = dividirRuta(RECTA, 0.25)
    expect(recorrido).toHaveLength(2)
    expect(recorrido[1][1]).toBeCloseTo(-12.005, 6)
  })
  it("acota fracciones fuera de rango", () => {
    expect(dividirRuta(RECTA, 1.7)).toEqual(dividirRuta(RECTA, 1))
    expect(dividirRuta(RECTA, -0.2)).toEqual(dividirRuta(RECTA, 0))
  })
  it("rutas largas (325 km, 5000 puntos) terminan en el último punto", () => {
    const larga: Coordenada[] = Array.from({ length: 5000 }, (_, i) => [-76, -13 - i * 0.0006])
    expect(dividirRuta(larga, 1).recorrido.at(-1)).toEqual(larga.at(-1))
  })
})

const sim = (ruta: string, recorridos: number[]): EstadoSimulacion => ({
  estado: "EN_CURSO",
  ruta,
  inicio: null,
  longitudM: 1000,
  autos: recorridos.map((r, i) => ({ posicion: i + 1, carId: `auto-${i + 1}`, companyId: null, fleetId: null, velocidadKmh: 60, recorridoM: r, llegadaMs: null })),
})

describe("fraccionLider", () => {
  it("usa el máximo recorrido entre los autos", () => expect(fraccionLider(sim("av-brasil", [300, 400]), "av-brasil")).toBe(0.4))
  it("0 si la ruta elegida no es la de la carrera", () => expect(fraccionLider(sim("av-brasil", [400]), "panamericana-sur")).toBe(0))
  it("0 sin simulación o con longitud 0", () => {
    expect(fraccionLider(null, "av-brasil")).toBe(0)
    expect(fraccionLider({ ...sim("av-brasil", [10]), longitudM: 0 }, "av-brasil")).toBe(0)
  })
})
```
- [x] **Step 3: Ver que falla** — `npm test` → FAIL "Cannot find module './ruta-progreso'".
- [x] **Step 4: Implementar** — `ruta-progreso.ts`
```ts
import { metros } from "./distancia"
import type { EstadoSimulacion } from "./types"

export type Coordenada = [number, number]

const punto = ([lon, lat]: Coordenada) => ({ lon, lat })

/**
 * Corta la línea de la ruta en la fracción recorrida por el líder. Ambos tramos comparten el punto
 * de corte para que no quede un hueco entre las dos capas.
 */
export function dividirRuta(linea: Coordenada[], fraccion: number) {
  const f = Math.min(1, Math.max(0, fraccion))
  const largos = linea.slice(1).map((c, i) => metros(punto(linea[i]), punto(c)))
  let restante = f * largos.reduce((a, b) => a + b, 0)
  for (let i = 0; i < largos.length; i++) {
    if (restante <= largos[i] || i === largos.length - 1) {
      const t = largos[i] === 0 ? 0 : Math.min(1, restante / largos[i])
      const [a, b] = [linea[i], linea[i + 1]]
      const corte: Coordenada = t === 1 ? b : t === 0 ? a : [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
      // con t = 1 el corte es el vértice siguiente: no se duplica en el tramo recorrido
      const recorrido = t === 1 ? linea.slice(0, i + 2) : [...linea.slice(0, i + 1), corte]
      const pendiente = [corte, ...linea.slice(t === 1 ? i + 2 : i + 1)]
      // una LineString necesita al menos dos puntos
      return { recorrido, pendiente: pendiente.length > 1 ? pendiente : [corte, corte] }
    }
    restante -= largos[i]
  }
  return { recorrido: [linea[0], linea[0]], pendiente: linea }
}

/** Avance del primero (0..1) en la ruta elegida; 0 si la carrera es de otra ruta. */
export function fraccionLider(simulacion: EstadoSimulacion | null, rutaSeleccionada: string | null): number {
  if (!simulacion || simulacion.ruta !== rutaSeleccionada || simulacion.longitudM <= 0) return 0
  const maximo = Math.max(0, ...simulacion.autos.map((a) => a.recorridoM))
  return Math.min(1, maximo / simulacion.longitudM)
}
```
Casos borde: con `f = 0` corta en `i = 0, t = 0` → `recorrido = [p0, p0]`, `pendiente = línea`; con `f = 1` corta en el último segmento con `t = 1` → `recorrido = línea`, `pendiente = [pN, pN]`.
- [x] **Step 5: Ver que pasa** — `npm test` → PASS.
- [x] **Step 6: `tokens.ts`**
```ts
/** Color de una variable CSS del tema, para capas de MapLibre (que no entienden `var(--x)`). */
export function leerToken(nombre: string, porDefecto: string): string {
  if (typeof window === "undefined") return porDefecto
  return getComputedStyle(document.documentElement).getPropertyValue(nombre).trim() || porDefecto
}
```
- [x] **Step 7: `RutaLayer` con tres capas** — una fuente `ruta` (la geometría completa) y otra `ruta-progreso` con dos features (`tramo: "recorrido" | "pendiente"`). Capas, en orden, antes de `CAPA_AUTOS`:
  1. `ruta-borde`: `line-color: leerToken("--ruta-borde", "#ffffff")`, ancho `["interpolate",["linear"],["zoom"],11,6,15,12,18,18]`;
  2. `ruta-pendiente`: filtro `["==",["get","tramo"],"pendiente"]`, `line-color: --ruta-pendiente`, ancho 11→3, 15→6, 18→10;
  3. `ruta-recorrido`: igual, con `--ruta-recorrido`.
  Un segundo efecto con `[map, isLoaded, ruta, progreso]` hace `setData` de `ruta-progreso` con `dividirRuta(ruta.features[0].geometry.coordinates as Coordenada[], progreso)`. Como el efecto de creación depende de `isLoaded`, al cambiar el tema se recrean con los colores nuevos (Review Focus 1).
- [x] **Step 8: Conectar** — en `autos-map.tsx`: `<RutaLayer ruta={geometria} progreso={fraccionLider(simulacion, rutaSeleccionada)} />`.
- [x] **Step 9: Verificar** — `npm test && npm run lint && npm run build`; en el navegador: sin carrera la ruta es azul claro; durante la carrera el tramo azul fuerte crece hasta el líder; al elegir otra ruta todo queda pendiente; cambiar a oscuro en plena carrera mantiene las dos capas con los colores oscuros.
- [x] **Step 10: Commit** — `git commit -m "feat(dashboard): ruta en tramo recorrido y pendiente"`

---

### Task 8: Marcadores de salida y meta

**Files:**
- Modify: `features/autos/components/salida-meta.tsx`

- [x] **Step 1: Rediseño** — cada extremo es un `MapMarker` con `anchor="center"` y contenido:
  - Salida: círculo `size-6 rounded-full border-2 border-foreground bg-card` con `Play` (`size-3`, relleno) y al lado una etiqueta `bg-card text-card-foreground text-xs shadow px-2 py-1` con "Salida" en negrita y `ruta.desde` en `text-muted-foreground`;
  - Meta: círculo `bg-foreground text-background` con `Flag` y etiqueta "Meta" + `ruta.hasta`.
  - Nuevas props: `{ ruta, desde, hasta }: { ruta: FeatureCollection<LineString> | null; desde?: string; hasta?: string }`, que `autos-map.tsx` pasa desde la `ResumenRuta` elegida.
- [x] **Step 2: Verificar** — lint + build; sin emoji, legibles en claro y oscuro, en las cuatro rutas.
- [x] **Step 3: Commit** — `git commit -m "feat(dashboard): marcadores de salida y meta al estilo Carbon"`

---

### Task 9: Autos con color propio, número, rumbo y etiqueta del líder

**Files:**
- Modify: `features/autos/geojson.ts` (+ `geojson.test.ts` nuevo), `features/autos/vehiculo.ts`, `features/autos/components/autos-layer.tsx`, `features/autos/components/autos-map.tsx`

**Interfaces:**
- Consumes: `indiceColor` de `paleta.ts`, `leerToken` de `tokens.ts`.
- Produces: `PropiedadesAuto` gana `color: IndiceColor` y `numero: string`; `nombreIcono(color: IndiceColor | "off")`; `AutosLayer` gana la prop `lider: { carId: string; texto: string } | null`.

- [x] **Step 1: Test que falla** — `geojson.test.ts`
```ts
import { describe, expect, it } from "vitest"

import { aGeoJSON } from "./geojson"
import type { Auto } from "./types"

const auto = (carId: string, engine: "ON" | "OFF" = "ON"): Auto => ({
  carId, companyId: "emp-01", fleetId: "emp-01-f1", lat: -12, lon: -77, heading: 220, engine, battery: 100, ts: 1,
})

describe("aGeoJSON", () => {
  it("agrega color y número del auto", () => {
    const p = aGeoJSON([auto("auto-2")]).features[0].properties
    expect(p.color).toBe(2)
    expect(p.numero).toBe("2")
  })
  it("ids sin número usan las dos primeras letras como etiqueta", () =>
    expect(aGeoJSON([auto("car-xyz")]).features[0].properties.numero).toBe("CA"))
})
```
- [x] **Step 2: Ver que falla** — `npm test` → FAIL (`color` undefined).
- [x] **Step 3: Implementar** en `geojson.ts`: `PropiedadesAuto = Pick<…> & { color: IndiceColor; numero: string }` y en `aGeoJSON`:
```ts
color: indiceColor(a.carId),
numero: /-(\d+)$/.exec(a.carId)?.[1] ?? a.carId.slice(0, 2).toUpperCase(),
```
- [x] **Step 4: Ver que pasa** — `npm test` → PASS.
- [x] **Step 5: Íconos en `vehiculo.ts`** — reemplazar las 4 variantes motor/borde por 4 variantes `auto-1`, `auto-2`, `auto-3`, `auto-off`: círculo de 26 px de diámetro con el color (`leerToken("--auto-N", …)`), borde blanco de 2,5 px y un triángulo de rumbo arriba (el mapa lo rota con `icon-rotate`). El número no va en el canvas (giraría con el ícono): va como `text-field` de la capa.
```ts
export type VarianteIcono = 1 | 2 | 3 | "off"
export const nombreIcono = (v: VarianteIcono) => `auto-${v}`
```
`registrarIconos(mapa)` registra las 4 si faltan; como se llama al recargar el estilo, al cambiar el tema toma los colores nuevos.
- [x] **Step 6: Capa en `autos-layer.tsx`** — `ESTILO_VEHICULO.layout`:
  - `"icon-image": ["case", ["==", ["get","engine"], "OFF"], nombreIcono("off"), ["concat", "auto-", ["to-string", ["get","color"]]]]`;
  - `"text-field": ["get","numero"]`, `"text-font": ["Open Sans Semibold"]` (fuente disponible en los estilos de CARTO), `"text-size": 11`, `"text-allow-overlap": true`, `"text-rotation-alignment": "viewport"`;
  - `paint: { "text-color": ["case", ["==",["get","color"],1], "#ffffff", "#161616"] }` (blanco sobre morado, negro sobre cian/amarillo; contraste ≥ 4.5).
  - Popup: agregar "Color" no hace falta; el popup se mantiene igual (RF-U11).
- [x] **Step 7: Etiqueta del líder** — capa `autos-lider` (symbol) sobre la misma fuente, filtrada por `["==", ["get","carId"], lider.carId]`, con `text-field: lider.texto`, `text-anchor: "right"`, `text-offset: [-1.6, 0]`, `text-justify: "left"`, halo `leerToken("--card")` de 2 px y color `leerToken("--foreground")`. Un efecto con `[map, lider]` aplica `setFilter` y `setLayoutProperty("autos-lider", "text-field", lider.texto)`; con `lider === null` se oculta (`visibility: none`). En `autos-map.tsx`:
```ts
const primero = simulacion?.estado === "EN_CURSO" ? simulacion.autos[0] : undefined
const lider = primero ? { carId: primero.carId, texto: `1º ${primero.carId}\n${primero.velocidadKmh} km/h · ${km.format(primero.recorridoM / 1000)} km` } : null
```
- [x] **Step 8: Verificar** — `npm test && npm run lint && npm run build`; en el navegador: tres colores distintos con número, la flecha apunta hacia donde avanza, el que llega se vuelve gris, la etiqueta sigue al líder y cambia cuando hay adelantamiento; filtro por empresa sigue ocultando autos (y la etiqueta si el líder queda fuera); cambio de tema en plena carrera conserva todo.
- [x] **Step 9: Commit** — `git commit -m "feat(dashboard): autos con color por auto, número y etiqueta del líder"`

---

### Task 10: Controles del mapa, leyenda y barra de escala

**Files:**
- Create: `features/autos/components/controles-mapa.tsx`, `features/autos/components/leyenda.tsx`
- Modify: `features/autos/components/autos-map.tsx`

**Interfaces:**
- Consumes: `useMap` de `@/components/ui/map`; `varColor` de `paleta.ts`; `limitesDe` (moverlo de `autos-map.tsx` a `ruta-progreso.ts` y exportarlo).
- Produces: `ControlesMapa({ ruta }: { ruta: FeatureCollection<LineString> | null })`, `Leyenda({ autos }: { autos: { carId: string; empresa: string }[] })`.

- [x] **Step 1: `controles-mapa.tsx`** — dentro de `<Map>`:
  - grupo vertical abajo a la derecha (`absolute right-4 bottom-10 bg-card shadow`), botones de 40×40 con `aria-label`: Acercar (`Plus`, `map.zoomIn()`), Alejar (`Minus`, `map.zoomOut()`), Encuadrar la ruta (`Maximize`, `map.fitBounds(limitesDe(ruta), { padding: 60 })`, deshabilitado sin ruta), Orientar al norte (`Compass`, `map.resetNorthPitch()`);
  - barra inferior `absolute inset-x-0 bottom-0 h-6 bg-card/85 text-[11px] text-muted-foreground` con: escala (efecto que hace `map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left")` y la quita al desmontar; CSS en `globals.css` para que `.maplibregl-ctrl-scale` use tokens), coordenadas del centro y zoom en `font-mono` (estado actualizado en `moveend`, no por frame), y la atribución que ya da MapLibre.
- [x] **Step 2: `leyenda.tsx`** — tarjeta `absolute left-4 bottom-10 bg-card shadow min-w-[200px]`: título "Leyenda", un ítem por auto (círculo con `varColor`, "auto-N · Empresa 0X"), separador y dos ítems de tramo (línea `bg-[var(--ruta-recorrido)]` "Tramo recorrido por el líder" y `bg-[var(--ruta-pendiente)]` "Tramo pendiente"). Los autos salen de `simulacion.autos` (ya ordenados) con `nombreEmpresa`.
- [x] **Step 3: Verificar** — lint + build; cada botón hace lo que dice; la escala cambia al hacer zoom; coordenadas y zoom se actualizan al soltar; la leyenda no tapa los controles a 1280 px; a 390 px la leyenda se oculta (`hidden sm:block`) para no tapar el mapa.
- [x] **Step 4: Commit** — `git commit -m "feat(dashboard): controles, leyenda y escala del mapa"`

---

### Task 11: Documentación y verificación en Docker

**Files:**
- Modify: `docs/specs/telemetria.md` §10, `CLAUDE.md` (bloque Frontend), `docs/plans/ui-carbon/README.md` (marcar tareas)

- [x] **Step 1: Spec §10** — actualizar:
  - RF-U1: cabecera + panel lateral fijo + mapa; en celular el panel se apila;
  - RF-U2: marcadores Salida/Meta con ícono (sin emoji) y tramo recorrido/pendiente;
  - RF-U4: color por auto, cronómetro de carrera, bandera de `lucide-react`;
  - RF-U8: círculo con color categórico por auto (`--auto-1..3`), número y flecha de rumbo; gris con motor OFF; ya no hay borde por tipo;
  - RF-U12: tokens de Carbon G10/G100 e IBM Plex;
  - nuevo RF-U13: controles (zoom, encuadrar, norte), leyenda, escala y etiqueta del líder.
- [x] **Step 2: CLAUDE.md** — en Frontend, cambiar "una fuente GeoJSON con una capa `symbol` de íconos (`vehiculo.ts`)" por la versión con color por auto y agregar: "tokens de Carbon (G10/G100) en `globals.css`; MapLibre lee los colores con `leerToken`; tests de funciones puras con Vitest (`npm test`)". Agregar `npm test` al bloque de comandos del dashboard.
- [x] **Step 3: Verificación final**
```bash
cd dashboard-next && npm test && npm run lint && npm run build
cd .. && docker compose up -d --build dashboard
```
En http://localhost:3000 recorrer: carrera completa en Av. Brasil, cambio de velocidad, seguir al líder, filtro por empresa/flota, cambio de tema a mitad de carrera, Vía Los Libertadores (325 km) con seguir al líder, y ancho de 390 px.
- [x] **Step 4: Commit** — `git commit -m "docs(dashboard): documentar la interfaz Carbon en la spec y CLAUDE.md"`
- [x] **Step 5: Integrar** — usar `superpowers:finishing-a-development-branch` para el merge a `develop` (sin PR, STD-GIT-001).

## Verificación end-to-end

1. `cd dashboard-next && npm test` → todos los tests de `features/autos/*.test.ts` en verde.
2. `npm run lint && npm run build` sin errores.
3. `docker compose up -d --build dashboard` y en http://localhost:3000 los checks de la Task 11, Step 3.
4. Comparar visualmente con el artboard A del lienzo de diseño.
