# 05 · Carrera sin scroll

**Objetivo:** aplicar la distribución del diseño:
- el mapa ocupa toda el área;
- encima flota la **tarjeta de control** (360 px): carrera, ruta, botones y clasificación;
- al lado flota una **barra** con el filtro de empresa/flota y las métricas en chips;
- el panel no hace scroll a 1440×900 y en el celular todo se apila sobre el mapa.

**Archivos:**
- Crear: `dashboard-next/features/autos/components/barra-mapa.tsx`, `dashboard-next/features/autos/components/metricas-chips.tsx`.
- Eliminar: `dashboard-next/features/autos/components/metricas-tiles.tsx`.
- Modificar: `dashboard-next/features/autos/components/carrera-panel.tsx`: se quitan las secciones de filtro y métricas y sus props.
- Modificar: `dashboard-next/features/autos/components/autos-map.tsx`: nuevo layout y `PanelVivo`.

**Interfaces:**
- Consume `ResumenMetricas` (de `carrera-panel.tsx`), y `Filtro` y `Opcion` (de `../filtros`).
- Produce:
  - `BarraMapa({ empresas, flotas, filtro, onCambiarFiltro, metricas })`;
  - `MetricasChips({ metricas })`;
  - `CarreraPanel`, que deja de recibir `empresas`, `flotas`, `filtro`, `onCambiarFiltro` y `metricas`.

## Pasos

- [ ] **Paso 1: métricas como chips**

Crea `features/autos/components/metricas-chips.tsx` y borra `metricas-tiles.tsx`:

```tsx
import { segundos } from "../formato"
import type { ResumenMetricas } from "./carrera-panel"

/** Tres indicadores del flujo (RF-U11) como chips compactos para la barra del mapa. */
export function MetricasChips({ metricas }: { metricas: ResumenMetricas }) {
  const chips = [
    { etiqueta: "Mostrados", valor: `${metricas.mostrados}/${metricas.total}` },
    { etiqueta: "Último dato", valor: segundos(metricas.edadUltimoDatoMs) },
    { etiqueta: "Latencia p95", valor: segundos(metricas.latenciaP95Ms) },
  ]
  return (
    <dl aria-label="Métricas del flujo" className="flex flex-wrap gap-2">
      {chips.map((c) => (
        <div key={c.etiqueta} className="flex h-8 items-center gap-1.5 rounded-full bg-muted px-3">
          <dt className="text-xs text-muted-foreground">{c.etiqueta}</dt>
          <dd className="font-mono text-[13px]">{c.valor}</dd>
        </div>
      ))}
    </dl>
  )
}
```

- [ ] **Paso 2: barra sobre el mapa**

Crea `features/autos/components/barra-mapa.tsx`:

```tsx
"use client"

import { Select, SelectItem } from "@carbon/react"

import type { Filtro, Opcion } from "../filtros"
import type { ResumenMetricas } from "./carrera-panel"
import { MetricasChips } from "./metricas-chips"

const TODAS = ""

/** Barra flotante: filtro empresa → flota y métricas del flujo. */
export function BarraMapa({
  empresas,
  flotas,
  filtro,
  onCambiarFiltro,
  metricas,
}: {
  empresas: Opcion[]
  flotas: Opcion[]
  filtro: Filtro
  onCambiarFiltro: (filtro: Filtro) => void
  metricas: ResumenMetricas
}) {
  return (
    <div
      role="toolbar"
      aria-label="Filtro y métricas"
      className="pointer-events-auto flex min-w-0 flex-[1_1_480px] flex-wrap items-center gap-2 rounded-lg bg-card p-2 shadow-flotante"
    >
      <Select
        id="empresa"
        inline
        size="sm"
        labelText="Empresa"
        value={filtro.empresa ?? TODAS}
        onChange={(e) => onCambiarFiltro({ empresa: e.target.value || null, flota: null })}
      >
        <SelectItem value={TODAS} text="Todas" />
        {empresas.map((o) => (
          <SelectItem key={o.id} value={o.id} text={`${o.nombre} · ${o.autos}`} />
        ))}
      </Select>
      <Select
        id="flota"
        inline
        size="sm"
        labelText="Flota"
        value={filtro.flota ?? TODAS}
        disabled={!filtro.empresa}
        onChange={(e) => onCambiarFiltro({ ...filtro, flota: e.target.value || null })}
      >
        <SelectItem value={TODAS} text="Todas" />
        {flotas.map((o) => (
          <SelectItem key={o.id} value={o.id} text={`${o.nombre} · ${o.autos}`} />
        ))}
      </Select>
      <span aria-hidden className="h-6 w-px bg-border" />
      <MetricasChips metricas={metricas} />
    </div>
  )
}
```

- [ ] **Paso 3: panel sin filtro ni métricas**

En `features/autos/components/carrera-panel.tsx`:
1. Borra la sección `<section aria-labelledby="titulo-filtro" …>…</section>` completa, la línea `<MetricasTiles metricas={metricas} />`, el import de `MetricasTiles`, la constante `TODAS` y el import de `Filtro, Opcion` (solo si ya no se usa).
2. Quita de la desestructuración y del tipo de props: `empresas`, `flotas`, `filtro`, `onCambiarFiltro` y `metricas`.
3. Quita `SelectItem` del import de Carbon solo si ya no se usa (sigue en uso para la ruta).

- [ ] **Paso 4: layout del mapa a pantalla completa en `autos-map.tsx`**

Agrega el import `import { BarraMapa } from "./barra-mapa"` y reemplaza el `return (…)` del componente `AutosMap` por:

```tsx
  return (
    <div className="flex h-full flex-col">
      <Encabezado conexion={conexion} />
      {/* El mapa llena el área y el control flota encima; en el celular el mapa pasa debajo con altura propia */}
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div className="absolute inset-0 max-sm:static max-sm:order-last max-sm:h-[60dvh]">
          <Map ref={mapa} center={LIMA} zoom={11}>
            <RutaLayer ruta={geometria} progreso={fraccionLider(simulacion, rutaSeleccionada)} />
            <SalidaMeta ruta={geometria} desde={resumenRuta?.desde} hasta={resumenRuta?.hasta} />
            <AutosLayer ref={capa} filtro={filtro} lider={etiquetaMapa} />
            <ControlesMapa ruta={geometria} />
          </Map>
          {leyenda.length > 0 && <Leyenda autos={leyenda} />}
        </div>
        {/* pointer-events-none deja arrastrar el mapa entre las tarjetas */}
        <div className="pointer-events-none relative flex min-h-0 flex-wrap items-start gap-4 p-4">
          <PanelVivo
            resumir={resumir}
            opciones={opciones}
            filtro={filtro}
            rutas={rutas}
            rutaSeleccionada={rutaSeleccionada}
            onElegirRuta={setRutaSeleccionada}
            simulacion={simulacion}
            ocupado={ocupado}
            onIniciar={iniciar}
            onDetener={detener}
            onVelocidad={velocidad}
            seguirLider={seguirLider}
            onSeguirLider={setSeguirLider}
            onCambiarFiltro={cambiarFiltro}
            error={error}
          />
        </div>
      </div>
    </div>
  )
```

Reemplaza el tipo `PropsPanel` y la función `PanelVivo` (al final del archivo) por:

```tsx
type PropsPanel = Omit<Parameters<typeof CarreraPanel>[0], "ahoraMs"> & {
  resumir: () => ResumenMetricas
  opciones: () => { empresas: Opcion[]; flotas: Opcion[] }
  filtro: Filtro
  onCambiarFiltro: (filtro: Filtro) => void
}

/** Refresca métricas, opciones del filtro y cronómetro una vez por segundo sin rerenderizar el mapa. */
function PanelVivo({ resumir, opciones, filtro, onCambiarFiltro, ...resto }: PropsPanel) {
  const [metricas, setMetricas] = useState<ResumenMetricas>({
    total: 0,
    mostrados: 0,
    edadUltimoDatoMs: null,
    latenciaP95Ms: null,
  })
  const [listas, setListas] = useState<{ empresas: Opcion[]; flotas: Opcion[] }>({ empresas: [], flotas: [] })
  const [ahoraMs, setAhoraMs] = useState(0)

  useEffect(() => {
    const refrescar = () => {
      setMetricas(resumir())
      setListas(opciones())
      setAhoraMs(Date.now())
    }
    refrescar()
    const id = setInterval(refrescar, 1_000)
    return () => clearInterval(id)
  }, [resumir, opciones, filtro])

  return (
    <>
      <aside
        aria-label="Control de la carrera"
        className="pointer-events-auto flex max-h-full w-full min-w-0 flex-col overflow-y-auto rounded-lg bg-card shadow-flotante sm:w-[360px]"
      >
        <CarreraPanel ahoraMs={ahoraMs} {...resto} />
      </aside>
      <BarraMapa
        empresas={listas.empresas}
        flotas={listas.flotas}
        filtro={filtro}
        onCambiarFiltro={onCambiarFiltro}
        metricas={metricas}
      />
    </>
  )
}
```

`overflow-y-auto` queda solo como respaldo para pantallas de menos de 768 px de alto; el criterio de este incremento es que a 1440×900 no aparezca.

- [ ] **Paso 5: verificar**

```bash
npm test && npm run lint && npm run build
```

Esperado: todo en verde.

En el navegador, con una carrera en curso:
1. **A 1440×900** (DevTools → dimensiones):
   - `document.querySelector('aside[aria-label="Control de la carrera"]').scrollHeight <= .clientHeight` da `true`, así que no hay scroll;
   - la barra queda a la derecha de la tarjeta.
2. **El mapa se arrastra** haciendo clic entre la tarjeta y la barra.
3. **A 390×844** (Review Focus 5):
   - la tarjeta y la barra se apilan arriba;
   - el mapa queda debajo con unos 500 px de alto y se puede mover.
4. **Filtro y chips:** el filtro de empresa/flota sigue ocultando autos en el mapa, y los chips se actualizan cada segundo.

- [ ] **Paso 6: commit**

```bash
git add dashboard-next/features/autos/components/barra-mapa.tsx dashboard-next/features/autos/components/metricas-chips.tsx \
  dashboard-next/features/autos/components/metricas-tiles.tsx dashboard-next/features/autos/components/carrera-panel.tsx \
  dashboard-next/features/autos/components/autos-map.tsx
git commit -m "feat(dashboard): carrera sin scroll con tarjeta de control y barra sobre el mapa

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
