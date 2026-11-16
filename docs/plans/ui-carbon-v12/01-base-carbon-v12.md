# 01 · Base Carbon con flag v12

**Objetivo:** instalar Carbon y activar el flag `enable-v12-release`, sin cambiar todavía ninguna pantalla. shadcn sigue funcionando.

**Archivos:**
- Modificar: `dashboard-next/package.json` y `package-lock.json` (con npm).
- Crear: `dashboard-next/app/carbon.scss`, `dashboard-next/components/flags-carbon.tsx`.
- Modificar: `dashboard-next/app/layout.tsx`, `dashboard-next/app/globals.css` (líneas 1–3 y el bloque `:root`).

**Interfaces:**
- Produce `FlagsCarbon({ children })`, que envuelve la app con los flags de Carbon para React, y la hoja `app/carbon.scss`. Los incrementos siguientes agregan reglas a esa hoja.
- Produce las variables `--font-plex-sans` y `--font-plex-mono`, ahora con los nombres literales `'IBM Plex Sans'` e `'IBM Plex Mono'`.

**Por qué Fontsource y no `next/font`:** los estilos de Carbon piden la familia literal `'IBM Plex Sans'`. `next/font` la registra con un nombre generado (`__IBM_Plex_Sans_xxx`), así que los componentes de Carbon caerían en Helvetica. Fontsource registra el nombre exacto.

## Pasos

- [x] **Paso 1: instalar dependencias**

```bash
cd dashboard-next
npm install @carbon/react @carbon/icons-react @fontsource/ibm-plex-sans @fontsource/ibm-plex-mono
npm install -D sass
```

Esperado: `package.json` gana las 4 dependencias y `sass` en `devDependencies`, sin errores de *peer dependencies* con React 19.3. Si npm se queja de React, **detente** y reporta la versión de `@carbon/react` y el mensaje: no uses `--force` ni `--legacy-peer-deps`.

- [x] **Paso 2: confirmar el flag y su sintaxis en la versión instalada**

```bash
grep -n -A3 "enable-v12-release" node_modules/@carbon/feature-flags/feature-flags.yml
grep -rn "feature-flags" node_modules/@carbon/react/scss/_feature-flags.scss
grep -n "flags\|enableV12" node_modules/@carbon/react/lib/components/FeatureFlags/index.d.ts
```

Esperado:
1. El primer comando muestra un bloque `name: enable-v12-release`. Si no aparece, la versión instalada no trae el flag: **detente** y reporta la versión. No sigas sin v12.
2. El segundo muestra que la hoja reenvía el mapa `$feature-flags` de `@carbon/feature-flags`. Es la sintaxis `with ($feature-flags: (...))` del paso 3.
3. El tercero muestra la prop `flags` (un mapa `{ "nombre-del-flag": boolean }`) o una prop booleana `enableV12Release`. Usa la que exista en el paso 4.

Anota en el commit la versión de `@carbon/react` (`npm ls @carbon/react`).

- [x] **Paso 3: crear `app/carbon.scss`**

```scss
// Carbon Design System con el flag de v12: esquinas redondeadas, campos con borde y botones de ícono
// circulares. El flag se configura antes del primer @use de Carbon; si no, Sass ya cargó el módulo.
@use '@carbon/react/scss/feature-flags' with (
  $feature-flags: (
    'enable-v12-release': true,
  )
);
@use '@carbon/react';
```

- [x] **Paso 4: crear `components/flags-carbon.tsx`**

```tsx
"use client"

import { FeatureFlags } from "@carbon/react"
import type { ReactNode } from "react"

/** Activa el comportamiento de Carbon v12 en los componentes de React (el CSS lo activa app/carbon.scss). */
export function FlagsCarbon({ children }: { children: ReactNode }) {
  return <FeatureFlags flags={{ "enable-v12-release": true }}>{children}</FeatureFlags>
}
```

Si el paso 2 mostró `enableV12Release` y no `flags`, usa `<FeatureFlags enableV12Release>{children}</FeatureFlags>`.

- [x] **Paso 5: tipografía con Fontsource y Carbon en `app/layout.tsx`**

Reemplaza el archivo completo:

```tsx
import type { Metadata } from "next"
import "@fontsource/ibm-plex-sans/400.css"
import "@fontsource/ibm-plex-sans/600.css"
import "@fontsource/ibm-plex-mono/400.css"
import "@fontsource/ibm-plex-mono/500.css"

import { FlagsCarbon } from "@/components/flags-carbon"
import { ThemeProvider } from "@/components/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"

// Carbon primero: globals.css (Tailwind y tokens de la app) se apoya en sus variables --cds-*
import "./carbon.scss"
import "./globals.css"

export const metadata: Metadata = {
  title: "Telemetría de autos",
  description: "Flota en tiempo real: Kafka, Flink y Quarkus",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" suppressHydrationWarning className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <FlagsCarbon>
            <TooltipProvider>{children}</TooltipProvider>
          </FlagsCarbon>
        </ThemeProvider>
      </body>
    </html>
  )
}
```

- [x] **Paso 6: Tailwind sin preflight en `app/globals.css`**

Carbon trae su propio *reset*; el preflight de Tailwind lo pisaría (botones, listas, encabezados). Cambia la línea 1:

```css
@import "tailwindcss";
```

por:

```css
/* Sin preflight: el reset es el de Carbon (app/carbon.scss). Tailwind aporta tema y utilidades de layout. */
@layer theme, base, components, utilities;
@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/utilities.css" layer(utilities);
```

Al inicio del bloque `:root { … }`, agrega las dos variables de fuente que antes ponía `next/font`:

```css
  --font-plex-sans: "IBM Plex Sans", "Helvetica Neue", Arial, sans-serif;
  --font-plex-mono: "IBM Plex Mono", Menlo, monospace;
```

- [x] **Paso 7: verificar**

```bash
npm test && npm run lint && npm run build
grep -rl "cds--btn" .next/static | head -1
```

Esperado:
- tests, lint y build en verde;
- `grep` imprime una hoja `.css`: el CSS de Carbon quedó en el bundle.

Después, con `npm run dev`, abre http://localhost:3000 y revisa en las DevTools:
- `getComputedStyle(document.body).fontFamily` empieza por `"IBM Plex Sans"`;
- la pantalla de la carrera se ve igual que antes, salvo detalles del *reset*: sin bordes perdidos en el panel ni botones con estilo nativo del navegador.

Si algo de shadcn se rompe por el reset, anótalo en el commit: se reemplaza en 04–06.

- [x] **Paso 8: commit**

```bash
git add dashboard-next/package.json dashboard-next/package-lock.json dashboard-next/app/carbon.scss \
  dashboard-next/components/flags-carbon.tsx dashboard-next/app/layout.tsx dashboard-next/app/globals.css
git commit -m "build(dashboard): instalar Carbon con el flag enable-v12-release

@carbon/react <versión del paso 2>, Fontsource IBM Plex y Tailwind sin preflight.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
