# 06 · Controles y leyenda del mapa

**Objetivo:** pasar los controles del mapa a botones de ícono circulares de Carbon (v12), y la leyenda y las coordenadas a tarjetas y píldoras flotantes, como en el diseño:
- controles abajo a la derecha;
- leyenda a su izquierda;
- coordenadas abajo al centro;
- escala abajo a la izquierda.

**Archivos:**
- Reescribir: `dashboard-next/features/autos/components/controles-mapa.tsx`.
- Reescribir: `dashboard-next/features/autos/components/leyenda.tsx`.

**Interfaces:**
- Las props no cambian: `ControlesMapa({ ruta })` y `Leyenda({ autos: { carId, empresa }[] })`.
- Consume `IconButton` de `@carbon/react`, `useMap` de `@/components/ui/map` y `limitesDe` de `../ruta-progreso`.

## Pasos

- [ ] **Paso 1: controles con `IconButton`**

Reemplaza `features/autos/components/controles-mapa.tsx`:

```tsx
"use client"

import { IconButton } from "@carbon/react"
import { Add, Compass, FitToScreen, Subtract } from "@carbon/icons-react"
import type { FeatureCollection, LineString } from "geojson"
import * as MapLibreGL from "maplibre-gl"
import { useEffect, useState } from "react"

import { useMap } from "@/components/ui/map"

import { limitesDe } from "../ruta-progreso"

const coordenada = new Intl.NumberFormat("es-PE", { minimumFractionDigits: 4, maximumFractionDigits: 4 })
const zoom = new Intl.NumberFormat("es-PE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const FLOTANTE = "bg-card! text-foreground! shadow-flotante"

/**
 * Controles del mapa con botones de ícono circulares (Carbon v12): acercar, alejar, encuadrar la ruta y
 * orientar al norte; la escala de MapLibre, y el centro y el zoom, que se actualizan al terminar cada movimiento.
 */
export function ControlesMapa({ ruta }: { ruta: FeatureCollection<LineString> | null }) {
  const { map } = useMap()
  const [vista, setVista] = useState<{ lat: number; lon: number; zoom: number } | null>(null)

  useEffect(() => {
    if (!map) return
    const escala = new MapLibreGL.ScaleControl({ unit: "metric", maxWidth: 96 })
    map.addControl(escala, "bottom-left")
    const alMover = () => {
      const { lat, lng } = map.getCenter()
      setVista({ lat, lon: lng, zoom: map.getZoom() })
    }
    alMover()
    map.on("moveend", alMover)
    return () => {
      map.off("moveend", alMover)
      // si el mapa ya se destruyó (desmontaje), MapLibre quitó el control y quitarlo otra vez falla
      if (map.hasControl(escala)) map.removeControl(escala)
    }
  }, [map])

  return (
    <>
      <div className="absolute right-4 bottom-4 z-10 flex flex-col gap-2">
        <IconButton label="Acercar" kind="ghost" align="left" className={FLOTANTE} onClick={() => map?.zoomIn()}>
          <Add />
        </IconButton>
        <IconButton label="Alejar" kind="ghost" align="left" className={FLOTANTE} onClick={() => map?.zoomOut()}>
          <Subtract />
        </IconButton>
        <IconButton
          label="Encuadrar la ruta"
          kind="ghost"
          align="left"
          className={FLOTANTE}
          disabled={!ruta}
          onClick={() => ruta && map?.fitBounds(limitesDe(ruta), { padding: 60, duration: 600 })}
        >
          <FitToScreen />
        </IconButton>
        <IconButton label="Orientar al norte" kind="ghost" align="left" className={FLOTANTE} onClick={() => map?.resetNorthPitch()}>
          <Compass />
        </IconButton>
      </div>
      {vista && (
        <div className="pointer-events-none absolute bottom-4 left-1/2 z-10 hidden h-7 -translate-x-1/2 items-center rounded-full bg-card px-3 font-mono text-xs text-muted-foreground shadow-flotante md:flex">
          {coordenada.format(vista.lat)}, {coordenada.format(vista.lon)} · zoom {zoom.format(vista.zoom)}
        </div>
      )}
    </>
  )
}
```

- [ ] **Paso 2: leyenda como tarjeta flotante**

Reemplaza `features/autos/components/leyenda.tsx`:

```tsx
import { varColor } from "../paleta"

/** Leyenda del mapa: color de cada auto con su empresa y los dos tramos de la ruta. */
export function Leyenda({ autos }: { autos: { carId: string; empresa: string }[] }) {
  return (
    <section
      aria-label="Leyenda del mapa"
      className="absolute right-[72px] bottom-4 z-10 hidden min-w-[216px] rounded-lg bg-card p-3 text-card-foreground shadow-flotante sm:block"
    >
      <h2 className="mb-2 text-xs font-semibold">Leyenda</h2>
      <ul className="flex flex-col gap-1.5 text-xs">
        {autos.map((a) => (
          <li key={a.carId} className="flex items-center gap-2">
            <span aria-hidden className="size-3 rounded-full" style={{ background: varColor(a.carId) }} />
            {a.carId} · {a.empresa}
          </li>
        ))}
        <li className="mt-0.5 flex items-center gap-2 border-t pt-2">
          <span aria-hidden className="h-1 w-5 rounded-full bg-[var(--ruta-recorrido)]" />
          Tramo recorrido por el líder
        </li>
        <li className="flex items-center gap-2">
          <span
            aria-hidden
            className="h-1 w-5 rounded-full bg-[repeating-linear-gradient(90deg,var(--ruta-pendiente)_0_3px,transparent_3px_7px)]"
          />
          Tramo pendiente
        </li>
      </ul>
    </section>
  )
}
```

El tramo pendiente se dibuja punteado desde ahora, para que coincida con el mapa monocromo de 07.

- [ ] **Paso 3: verificar**

```bash
npm test && npm run lint && npm run build
```

Esperado: todo en verde.

En el navegador:
- los 4 controles son círculos de 40 px con sombra y muestran su tooltip a la izquierda;
- "Encuadrar la ruta" vuelve a ajustar el mapa a la ruta;
- la leyenda no tapa los controles;
- en oscuro, controles y leyenda usan `#262626` con texto claro.

- [ ] **Paso 4: commit**

```bash
git add dashboard-next/features/autos/components/controles-mapa.tsx dashboard-next/features/autos/components/leyenda.tsx
git commit -m "feat(dashboard): controles circulares y leyenda flotante del mapa con Carbon

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
