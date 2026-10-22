# 07 · Mapa base gris y ruta monocroma

**Objetivo:** cambiar el mapa base de Carto (Positron/Dark Matter) por los tiles de **OpenFreeMap** (gratis, sin API key, esquema OpenMapTiles), recoloreados con los grises de Carbon. La ruta pasa a ser monocroma, así que los únicos colores del mapa son los autos.

**Archivos:**
- Crear: `dashboard-next/features/autos/estilo-mapa.ts`, `dashboard-next/features/autos/estilo-mapa.test.ts`.
- Crear: `dashboard-next/features/autos/hooks/use-estilos-mapa.ts`.
- Modificar:
  - `dashboard-next/features/autos/components/autos-map.tsx`: prop `styles` del `<Map>`;
  - `dashboard-next/features/autos/components/ruta-layer.tsx`: tramo pendiente punteado;
  - `dashboard-next/app/globals.css`: tokens `--ruta-*`.

**Interfaces:**
- Produce:
  - `type PaletaMapa = { suelo; manzana; parque; agua; via; borde; etiqueta: string }`;
  - `PALETA_CLARA` y `PALETA_OSCURA`;
  - `recolorear(estilo: StyleSpecification, paleta: PaletaMapa): StyleSpecification`, que es pura y no muta la entrada;
  - `useEstilosMapa(): { light: StyleSpecification; dark: StyleSpecification } | undefined`, que es `undefined` mientras carga o si falla. En ese caso mapcn usa Carto, sus estilos por defecto.
- El incremento 12 reutiliza `useEstilosMapa` desde `@/features/autos`.

## Pasos

- [ ] **Paso 1: test que falla**

`features/autos/estilo-mapa.test.ts`:

```ts
import type { StyleSpecification } from "maplibre-gl"
import { describe, expect, it } from "vitest"

import { PALETA_CLARA, recolorear } from "./estilo-mapa"

const base = (): StyleSpecification => ({
  version: 8,
  sources: {},
  layers: [
    { id: "background", type: "background", paint: { "background-color": "#fff" } },
    { id: "water", type: "fill", source: "openmaptiles", "source-layer": "water", paint: { "fill-color": "#abc" } },
    { id: "park", type: "fill", source: "openmaptiles", "source-layer": "park", paint: { "fill-color": "#0f0" } },
    { id: "building", type: "fill", source: "openmaptiles", "source-layer": "building", paint: { "fill-color": "#ddd" } },
    { id: "highway_major_casing", type: "line", source: "openmaptiles", "source-layer": "transportation", paint: { "line-color": "#ccc" } },
    { id: "highway_major", type: "line", source: "openmaptiles", "source-layer": "transportation", paint: { "line-color": "#eee" } },
    { id: "place_label", type: "symbol", source: "openmaptiles", "source-layer": "place", paint: { "text-color": "#000" } },
    { id: "poi_label", type: "symbol", source: "openmaptiles", "source-layer": "poi", layout: {} },
    { id: "otra", type: "hillshade", source: "dem" },
  ],
})

type Capa = { paint: Record<string, unknown>; layout: Record<string, unknown> }
const capa = (e: StyleSpecification, id: string) => e.layers.find((l) => l.id === id) as unknown as Capa

describe("recolorear", () => {
  const e = recolorear(base(), PALETA_CLARA)
  it("pinta el suelo, el agua, los parques y las manzanas", () => {
    expect(capa(e, "background").paint["background-color"]).toBe(PALETA_CLARA.suelo)
    expect(capa(e, "water").paint["fill-color"]).toBe(PALETA_CLARA.agua)
    expect(capa(e, "park").paint["fill-color"]).toBe(PALETA_CLARA.parque)
    expect(capa(e, "building").paint["fill-color"]).toBe(PALETA_CLARA.manzana)
  })
  it("distingue el borde de las vías de su relleno", () => {
    expect(capa(e, "highway_major_casing").paint["line-color"]).toBe(PALETA_CLARA.borde)
    expect(capa(e, "highway_major").paint["line-color"]).toBe(PALETA_CLARA.via)
  })
  it("etiquetas en gris con halo del suelo y sin puntos de interés", () => {
    expect(capa(e, "place_label").paint["text-color"]).toBe(PALETA_CLARA.etiqueta)
    expect(capa(e, "place_label").paint["text-halo-color"]).toBe(PALETA_CLARA.suelo)
    expect(capa(e, "poi_label").layout.visibility).toBe("none")
  })
  it("deja intactas las capas que no conoce y no muta la entrada", () => {
    const original = base()
    const copia = JSON.stringify(original)
    recolorear(original, PALETA_CLARA)
    expect(JSON.stringify(original)).toBe(copia)
    expect(capa(e, "otra")).toEqual({ id: "otra", type: "hillshade", source: "dem" })
  })
})
```

- [ ] **Paso 2: ver que falla**

Run: `npm test`
Esperado: FAIL, porque no se encuentra `./estilo-mapa`.

- [ ] **Paso 3: implementar `features/autos/estilo-mapa.ts`**

```ts
import type { LayerSpecification, StyleSpecification } from "maplibre-gl"

/** Colores del mapa base. MapLibre necesita valores concretos: son los grises de Carbon de cada tema. */
export type PaletaMapa = {
  suelo: string
  manzana: string
  parque: string
  agua: string
  via: string
  borde: string
  etiqueta: string
}

/** White: Gray 10 de suelo, vías blancas, agua Cool Gray 20 y etiquetas Gray 70. */
export const PALETA_CLARA: PaletaMapa = {
  suelo: "#f4f4f4",
  manzana: "#e8e8e8",
  parque: "#e5e8e3",
  agua: "#dde1e6",
  via: "#ffffff",
  borde: "#e0e0e0",
  etiqueta: "#525252",
}

/** G100: Gray 100 de suelo, vías Gray 80, agua Cool Gray 90 y etiquetas Gray 40. */
export const PALETA_OSCURA: PaletaMapa = {
  suelo: "#161616",
  manzana: "#1e1e1e",
  parque: "#1b201c",
  agua: "#21272a",
  via: "#393939",
  borde: "#262626",
  etiqueta: "#a8a8a8",
}

const PARQUES = new Set(["park", "landcover"])

function color(capa: LayerSpecification, p: PaletaMapa): LayerSpecification {
  const fuente = "source-layer" in capa ? capa["source-layer"] : undefined
  switch (capa.type) {
    case "background":
      return { ...capa, paint: { ...capa.paint, "background-color": p.suelo } }
    case "fill": {
      const c = fuente === "water" ? p.agua : PARQUES.has(fuente ?? "") ? p.parque : p.manzana
      return { ...capa, paint: { ...capa.paint, "fill-color": c, "fill-outline-color": c } }
    }
    case "line": {
      const c =
        fuente === "waterway" ? p.agua : fuente === "transportation" && !capa.id.includes("casing") ? p.via : p.borde
      return { ...capa, paint: { ...capa.paint, "line-color": c } }
    }
    case "symbol":
      // los puntos de interés compiten con los autos: se ocultan
      if (fuente === "poi") return { ...capa, layout: { ...capa.layout, visibility: "none" } }
      return { ...capa, paint: { ...capa.paint, "text-color": p.etiqueta, "text-halo-color": p.suelo } }
    default:
      return capa
  }
}

/** Copia del estilo con cada capa conocida pintada con la paleta; las demás quedan igual. */
export function recolorear(estilo: StyleSpecification, paleta: PaletaMapa): StyleSpecification {
  return { ...estilo, layers: estilo.layers.map((capa) => color(capa, paleta)) }
}
```

- [ ] **Paso 4: ver que pasa**

Run: `npm test`
Esperado: PASS.

- [ ] **Paso 5: hook que descarga el estilo una vez**

`features/autos/hooks/use-estilos-mapa.ts`:

```ts
"use client"

import type { StyleSpecification } from "maplibre-gl"
import { useEffect, useState } from "react"

import { PALETA_CLARA, PALETA_OSCURA, recolorear } from "../estilo-mapa"

/** Positron de OpenFreeMap: tiles vectoriales OpenMapTiles, gratis y sin API key. */
const ESTILO_BASE = "https://tiles.openfreemap.org/styles/positron"

type Estilos = { light: StyleSpecification; dark: StyleSpecification }
let cache: Promise<Estilos> | null = null

/** Estilos claro/oscuro con los grises de Carbon; `undefined` mientras carga o si falla (mapcn usa Carto). */
export function useEstilosMapa(): Estilos | undefined {
  const [estilos, setEstilos] = useState<Estilos>()
  useEffect(() => {
    cache ??= fetch(ESTILO_BASE)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<StyleSpecification>
      })
      .then((base) => ({ light: recolorear(base, PALETA_CLARA), dark: recolorear(base, PALETA_OSCURA) }))
    let vigente = true
    cache.then(
      (e) => vigente && setEstilos(e),
      () => {
        cache = null // se reintenta en el próximo montaje
      },
    )
    return () => {
      vigente = false
    }
  }, [])
  return estilos
}
```

En `autos-map.tsx`:
- importa `import { useEstilosMapa } from "../hooks/use-estilos-mapa"`;
- dentro de `AutosMap`, agrega `const estilos = useEstilosMapa()`;
- cambia `<Map ref={mapa} center={LIMA} zoom={11}>` por `<Map ref={mapa} center={LIMA} zoom={11} styles={estilos}>`.

Exporta el hook desde `features/autos/index.ts` (lo usa 12): agrega `export { useEstilosMapa } from "./hooks/use-estilos-mapa"`.

- [ ] **Paso 6: ruta monocroma**

En `app/globals.css`:
- en `:root`, cambia los tres tokens de la ruta:

```css
  --ruta-recorrido: var(--cds-text-primary);
  --ruta-pendiente: #a8a8a8;
  --ruta-borde: var(--cds-background);
```

- en `.dark`, borra las tres líneas `--ruta-*` y agrega solo `--ruta-pendiente: #6f6f6f;`. Las otras dos ya cambian con el tema de Carbon.

En `features/autos/components/ruta-layer.tsx`, dentro del `for` que crea `CAPA_PENDIENTE` y `CAPA_RECORRIDO`, agrega al `paint` del tramo pendiente un punteado:

```ts
          paint: {
            "line-color": leerToken(token, porDefecto),
            "line-width": ancho(3, 5, 8),
            ...(tramo === "pendiente" ? { "line-dasharray": [0.1, 2] } : {}),
          },
```

Conserva los anchos que ya tenga el archivo si son distintos; lo nuevo es solo el `line-dasharray`. Cambia los valores por defecto del arreglo a `"#a8a8a8"` (pendiente) y `"#161616"` (recorrido).

- [ ] **Paso 7: verificar**

```bash
npm test && npm run lint && npm run build
```

Esperado: todo en verde.

En el navegador:
- en la pestaña Red aparece `tiles.openfreemap.org/styles/positron` (200) y las teselas `.pbf`;
- el mapa es gris sin íconos de comercios, el agua es gris frío y la ruta es una línea oscura con el tramo pendiente punteado;
- al pasar a oscuro, el mapa pasa a Gray 100, la ruta recorrida se ve clara y los autos se redibujan (Review Focus 1);
- con `ESTILO_BASE` apuntando a una URL inválida, la app sigue funcionando con Carto. Revierte esa prueba antes del commit.

- [ ] **Paso 8: commit**

```bash
git add dashboard-next/features/autos/estilo-mapa.ts dashboard-next/features/autos/estilo-mapa.test.ts \
  dashboard-next/features/autos/hooks/use-estilos-mapa.ts dashboard-next/features/autos/index.ts \
  dashboard-next/features/autos/components/autos-map.tsx dashboard-next/features/autos/components/ruta-layer.tsx \
  dashboard-next/app/globals.css
git commit -m "feat(dashboard): mapa base OpenFreeMap con grises de Carbon y ruta monocroma

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
