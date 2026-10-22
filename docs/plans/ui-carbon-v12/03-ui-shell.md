# 03 · UI Shell de Carbon

**Objetivo:** reemplazar la cabecera hecha a mano por el `Header` de Carbon (G100), con secciones que son rutas reales de Next, estado del WebSocket y selector de tema.

**Archivos:**
- Crear: `dashboard-next/lib/secciones.ts`, `dashboard-next/lib/secciones.test.ts`.
- Crear: `dashboard-next/lib/tema.ts`, `dashboard-next/lib/tema.test.ts`.
- Modificar: `dashboard-next/vitest.config.ts` (incluir `lib/**/*.test.ts`).
- Reescribir: `dashboard-next/components/encabezado.tsx` y `dashboard-next/components/selector-tema.tsx`.

**Interfaces:**
- Produce `SECCIONES: Seccion[]`, con `Seccion = { href: string; nombre: string; disponible: boolean }`. Los incrementos 10 y 13 ponen `disponible: true` en Viajes y Operación.
- Produce `seccionActiva(pathname: string): string | null`, que devuelve el `href` de la sección actual.
- Produce `siguienteTema(actual: string | undefined): "light" | "dark" | "system"`.
- Produce `Encabezado({ conexion?: Conexion })`. Sin `conexion`, no muestra la etiqueta de estado (Viajes y Operación no usan el WebSocket).

## Pasos

- [x] **Paso 1: tests que fallan**

`dashboard-next/lib/secciones.test.ts`:

```ts
import { describe, expect, it } from "vitest"

import { seccionActiva } from "./secciones"

describe("seccionActiva", () => {
  it("la raíz es Carrera", () => expect(seccionActiva("/")).toBe("/"))
  it("una subruta pertenece a su sección", () => expect(seccionActiva("/viajes/1b4e28ba-2fa1-11d2-883f-0016d3cca427")).toBe("/viajes"))
  it("no confunde prefijos parecidos", () => expect(seccionActiva("/viajesx")).toBeNull())
  it("una ruta desconocida no activa nada", () => expect(seccionActiva("/otra")).toBeNull())
})
```

`dashboard-next/lib/tema.test.ts`:

```ts
import { describe, expect, it } from "vitest"

import { siguienteTema } from "./tema"

describe("siguienteTema", () => {
  it("rota claro → oscuro → sistema → claro", () => {
    expect(siguienteTema("light")).toBe("dark")
    expect(siguienteTema("dark")).toBe("system")
    expect(siguienteTema("system")).toBe("light")
  })
  it("sin tema guardado empieza por claro", () => expect(siguienteTema(undefined)).toBe("light"))
})
```

En `vitest.config.ts` cambia `include` por `["features/**/*.test.ts", "lib/**/*.test.ts"]`.

- [x] **Paso 2: ver que fallan**

Run: `npm test`
Esperado: FAIL, porque no se encuentran `./secciones` ni `./tema`.

- [x] **Paso 3: implementar**

`dashboard-next/lib/secciones.ts`:

```ts
export type Seccion = { href: string; nombre: string; disponible: boolean }

/** Secciones de la cabecera. Una sección se muestra cuando su pantalla existe. */
export const SECCIONES: Seccion[] = [
  { href: "/", nombre: "Carrera", disponible: true },
  { href: "/viajes", nombre: "Viajes", disponible: false },
  { href: "/operacion", nombre: "Operación", disponible: false },
]

/** `href` de la sección que contiene la ruta actual; la raíz solo coincide consigo misma. */
export function seccionActiva(pathname: string): string | null {
  if (pathname === "/") return "/"
  const s = SECCIONES.find((x) => x.href !== "/" && (pathname === x.href || pathname.startsWith(`${x.href}/`)))
  return s?.href ?? null
}
```

`dashboard-next/lib/tema.ts`:

```ts
const ORDEN = ["light", "dark", "system"] as const
export type Tema = (typeof ORDEN)[number]

/** Siguiente tema del botón de la cabecera: claro → oscuro → sistema. */
export function siguienteTema(actual: string | undefined): Tema {
  const i = ORDEN.indexOf(actual as Tema)
  return i === -1 ? "light" : ORDEN[(i + 1) % ORDEN.length]
}
```

- [x] **Paso 4: ver que pasan**

Run: `npm test`
Esperado: PASS, los 6 casos nuevos más los existentes.

- [x] **Paso 5: selector de tema como acción de la cabecera**

Reemplaza `dashboard-next/components/selector-tema.tsx`:

```tsx
"use client"

import { HeaderGlobalAction } from "@carbon/react"
import { Laptop, Moon, Sun } from "@carbon/icons-react"
import { useTheme } from "next-themes"
import { useSyncExternalStore } from "react"

import { siguienteTema } from "@/lib/tema"

const ETIQUETA = { light: "Tema claro", dark: "Tema oscuro", system: "Tema del sistema" } as const

/** `true` solo en el cliente: el tema guardado no se conoce durante el prerenderizado. */
function useMontado(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )
}

/** Un botón que rota claro → oscuro → sistema; la elección la guarda next-themes. */
export function SelectorTema() {
  const { theme, setTheme } = useTheme()
  const montado = useMontado()
  const actual = montado && (theme === "light" || theme === "dark") ? theme : "system"
  const Icono = actual === "light" ? Sun : actual === "dark" ? Moon : Laptop
  return (
    <HeaderGlobalAction
      aria-label={`${ETIQUETA[actual]}. Cambiar a ${ETIQUETA[siguienteTema(actual)].toLowerCase()}`}
      tooltipAlignment="end"
      onClick={() => setTheme(siguienteTema(actual))}
    >
      <Icono size={20} />
    </HeaderGlobalAction>
  )
}
```

- [x] **Paso 6: cabecera con el `Header` de Carbon**

Reemplaza `dashboard-next/components/encabezado.tsx`:

```tsx
"use client"

import { Header, HeaderGlobalBar, HeaderMenuItem, HeaderName, HeaderNavigation, Tag, Theme } from "@carbon/react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { SelectorTema } from "@/components/selector-tema"
import { SECCIONES, seccionActiva } from "@/lib/secciones"

export type Conexion = "conectando" | "abierta" | "reconectando"

const ESTADO: Record<Conexion, { texto: string; tipo: "green" | "gray" | "red" }> = {
  conectando: { texto: "Conectando", tipo: "gray" },
  abierta: { texto: "En vivo", tipo: "green" },
  reconectando: { texto: "Reconectando", tipo: "red" },
}

/** UI Shell de Carbon: G100 en ambos temas, secciones como rutas de Next, estado del WebSocket y tema. */
export function Encabezado({ conexion }: { conexion?: Conexion }) {
  const activa = seccionActiva(usePathname())
  return (
    <Theme theme="g100">
      {/* El Header de Carbon es fixed; aquí va en el flujo para que el layout flex no lo tape */}
      <Header aria-label="Telemetría" className="static!">
        <HeaderName as={Link} href="/" prefix="Telemetría">
          [Carrera]
        </HeaderName>
        <HeaderNavigation aria-label="Secciones">
          {SECCIONES.filter((s) => s.disponible).map((s) => (
            <HeaderMenuItem key={s.href} as={Link} href={s.href} isActive={activa === s.href}>
              {s.nombre}
            </HeaderMenuItem>
          ))}
        </HeaderNavigation>
        <HeaderGlobalBar>
          {conexion && (
            <Tag type={ESTADO[conexion].tipo} size="sm" role="status" className="self-center">
              {ESTADO[conexion].texto}
            </Tag>
          )}
          <SelectorTema />
        </HeaderGlobalBar>
      </Header>
    </Theme>
  )
}
```

`autos-map.tsx` ya importa `Encabezado` desde `@/components/encabezado` y le pasa `conexion`, así que no cambia. El tipo `Conexion` que devuelve `useAutosSocket` debe coincidir con el exportado aquí: si `use-autos-socket.ts` declara su propio tipo con los mismos tres valores, déjalo; TypeScript lo valida en el build.

- [x] **Paso 7: verificar**

```bash
npm test && npm run lint && npm run build
```

Esperado: todo en verde.

Si TypeScript rechaza `as={Link}` en `HeaderName` o en `HeaderMenuItem`, revisa la prop que declara tu versión: `grep -n "as?\|element?" node_modules/@carbon/react/lib/components/UIShell/HeaderMenuItem.d.ts`. Las versiones anteriores usan `element={Link}` en vez de `as`; usa la que exista y deja `href` igual. No uses `any`.

En el navegador:
- la cabecera mide 48 px y es oscura en los dos temas;
- *Carrera* aparece activa (borde inferior de Carbon);
- la etiqueta muestra "En vivo" con el backend arriba;
- el botón de tema rota claro → oscuro → sistema;
- con Tab el foco se ve en cada elemento.

- [x] **Paso 8: commit**

```bash
git add dashboard-next/lib/secciones.ts dashboard-next/lib/secciones.test.ts dashboard-next/lib/tema.ts \
  dashboard-next/lib/tema.test.ts dashboard-next/vitest.config.ts dashboard-next/components/encabezado.tsx \
  dashboard-next/components/selector-tema.tsx
git commit -m "feat(dashboard): cabecera con el UI Shell de Carbon y secciones por ruta

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
