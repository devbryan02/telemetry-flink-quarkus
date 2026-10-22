# 14 · Documentación y cierre

**Objetivo:** dejar la decisión y la documentación al día (ADR-005, spec, CLAUDE.md e índices), reconstruir el contenedor del dashboard y actualizar el grafo. No cambia código de producción.

**Archivos:**
- Crear: `knowledge/adrs/ADR-005-ui-carbon-v12.md`.
- Modificar:
  - `knowledge/README.md` (stack y tabla de ADRs);
  - `docs/specs/telemetria.md` (línea 4, diagrama de la línea 42, §10 y árbol de carpetas cerca de la línea 438);
  - `CLAUDE.md` (diagrama de la línea 23, viñetas de Frontend y sección de conocimiento);
  - `docs/plans/README.md` (fila de la iniciativa).

**Interfaces:** ninguna.

## Pasos

- [ ] **Paso 1: ADR-005**

`knowledge/adrs/ADR-005-ui-carbon-v12.md`:

```markdown
# ADR-005: Interfaz con Carbon Design System (flag v12) en lugar de shadcn/ui

**Estado:** Aceptado · **Fecha:** <fecha del commit> · **Detalle:** `docs/specs/telemetria.md` §10 · **Reemplaza:** «shadcn/ui» del frontend en `ADR-003`

El dashboard usa Carbon Design System de IBM:

- **Componentes:** `@carbon/react` e íconos de `@carbon/icons-react`. shadcn/ui y sus dependencias (`@base-ui/react`, `class-variance-authority`, `tw-animate-css`) se retiraron.
- **Flag v12:** `enable-v12-release` activo en Sass (`app/carbon.scss`) y en React (`components/flags-carbon.tsx`): botones en píldora, botones de ícono circulares, campos con borde y esquinas de 8 px.
- **Temas:** White (claro) y G100 (oscuro), por la clase `dark` de next-themes. Los tokens de la app (`globals.css`) apuntan a `--cds-*`.
- **Acción principal gris:** `kind="secondary"` de Carbon (Gray 80 / Gray 60). El color lo ponen los datos (autos y estados); el azul queda en enlaces y foco.
- **Tailwind 4:** solo para layout, sin preflight; el reset es el de Carbon.
- **Tipografía:** IBM Plex con Fontsource, porque Carbon pide la familia literal «IBM Plex Sans».
- **Mapa:** mapcn (MapLibre) se conserva con su `components/ui/map.tsx` y `lucide-react`. El mapa base son los tiles de OpenFreeMap con un estilo recoloreado con los grises de Carbon.
- **Sin estilo de IA de Carbon:** Carbon lo reserva para contenido generado por IA.

Límites que se aceptan:

- **v12 todavía no es estable:** el flag activa una dirección visual en *preview* que puede cambiar entre versiones menores de `@carbon/react`. La versión queda fijada en `package-lock.json`. Al actualizarla hay que revisar las pantallas.
- **Dependencia de OpenFreeMap:** el mapa base depende de un servicio externo gratuito; si falla, mapcn vuelve a Carto.
- **Componentes propios:** algunos (tarjetas de carrera, chips de métricas, gráfico de velocidad) son propios con tokens de Carbon, porque Carbon no los ofrece.
```

- [ ] **Paso 2: índice de conocimiento**

En `knowledge/README.md`:
- en la tabla de stack, la fila del frontend dice ahora `React 19 + Next.js 16 + Carbon Design System (flag v12) + mapcn ([ADR-005](adrs/ADR-005-ui-carbon-v12.md))`;
- la fila de ADR-003 queda con el estado `Aceptado (sin persistencia → ADR-004; shadcn/ui → ADR-005)`;
- agrega la fila de ADR-005 con el resumen «UI con `@carbon/react` y el flag `enable-v12-release`, temas White/G100, acción principal gris y mapa base gris» y el estado `Aceptado`.

- [ ] **Paso 3: spec `docs/specs/telemetria.md`**

- **Stack (línea 4) y diagrama (línea 42):** cambia `shadcn/ui` por `Carbon Design System (v12)`.
- **Título de §10:** `## 10. Frontend (React 19 + Next.js 16 + Carbon Design System v12 + MapLibre)`.
- **Tabla de §10:** la fila *Componentes UI* pasa a `**Carbon Design System** (`@carbon/react`, flag `enable-v12-release`): `Header`, `Button`, `IconButton`, `Select`, `Slider`, `Tag`, `ContentSwitcher`, `DatePicker`, `InlineNotification``. En la fila *Mapa*, cambia «registro shadcn» por «componente de mapcn».
- **RF-U2, RF-U5 y RF-U7:** «`Select` de shadcn» y «`Slider` de shadcn» pasan a ser los componentes de Carbon.
- **RF-U5:** agrega que, con el teclado, la velocidad se envía al salir del control.
- **Tema (línea 370):** los tokens son los de Carbon (White/G100 en `app/carbon.scss`) y el mapa base es OpenFreeMap recoloreado (07), con Carto de respaldo.
- **Requisitos nuevos de §10:**
  - **RF-U13 (Viajes):** `/viajes` agrupa los viajes del día por carrera, con clasificación (tiempo y diferencia para los que llegaron; distancia y metros detrás para el resto). Filtra por estado, ruta y fecha, y se refresca cada 5 s con una carrera en curso.
  - **RF-U14 (Repetición):** `/viajes/{viajeId}` muestra el recorrido (`GET /viajes/{id}/posiciones`) con reproductor (1×/4×/16×, ±10 s), velocidad calculada entre muestras y huecos de más de 1,5 s. Empieza en pausa.
  - **RF-U15 (Operación):** `/operacion` muestra la readiness (200/503) por check y canal, el flujo de eventos y las métricas Prometheus documentadas en el runbook. Se refresca cada 5 s.
- **Árbol de carpetas:** `components/ui/` pasa a ser «solo `map.tsx` (mapcn)». Agrega `features/viajes/` y `features/operacion/`, y `app/viajes/` y `app/operacion/`.

- [ ] **Paso 4: CLAUDE.md**

- Diagrama (línea 23): `Next.js 16 + Carbon v12 + mapcn (MapLibre) ◄── axios (autos, ruta, simulación, viajes, operación) + WebSocket nativo`.
- En **Frontend**, reemplaza la viñeta «interfaz basada en Carbon: tokens G10/G100…» por:
  - interfaz con `@carbon/react` y el flag `enable-v12-release` (`app/carbon.scss` y `components/flags-carbon.tsx`); temas White/G100 por la clase `dark`; los tokens de `globals.css` apuntan a `--cds-*` y MapLibre los lee con `leerToken`;
  - acción principal con `kind="secondary"` (gris); Tailwind solo para layout, sin preflight; IBM Plex con Fontsource;
  - no edites `components/ui/map.tsx` (mapcn). shadcn ya no existe en el proyecto.
- En la viñeta del tema, cambia «Usa tokens de shadcn (`bg-popover`…)» por «Usa los tokens de la app (`bg-card`, `text-foreground`…) o `var(--cds-*)`».
- Agrega una viñeta: «Pantallas: `/` (carrera), `/viajes` (por carrera), `/viajes/[viajeId]` (repetición) y `/operacion`. Las features `viajes` y `operacion` tienen su propio cliente HTTP y no importan internos de `autos`.»
- En **Base de conocimiento**, agrega `ADR-005` (Carbon v12) junto a ADR-003 y ADR-004.

- [ ] **Paso 5: índice de planes**

La iniciativa ya figura en `docs/plans/README.md` desde que se redactó el plan. Al cerrar, agrega en `docs/plans/ui-carbon-v12/README.md`, debajo del título, la línea `Los 14 incrementos están implementados.` (como en `persistencia-posiciones-viajes/README.md`).

- [ ] **Paso 6: verificación final**

```bash
cd dashboard-next && npm test && npm run lint && npm run build && cd ..
docker compose up -d --build dashboard
graphify update .
git diff --check
```

Esperado:
- tests, lint y build en verde;
- el contenedor `dashboard` levanta;
- `graphify` termina sin errores;
- `git diff --check` no imprime nada.

Recorrido en http://localhost:3000 (contenedor), en claro y en oscuro:
1. **Carrera:** iniciar en Av. Brasil, cambiar la velocidad de un auto, seguir al líder y filtrar por empresa. A 1440×900, el panel no tiene scroll.
2. **Viajes:** aparece la carrera en curso y se actualiza; al terminar, muestra tiempos y diferencias.
3. **Repetición:** clic en un auto, play a 16× hasta el final y cambio a otro auto de la lista.
4. **Operación:** readiness UP, canales en verde y eventos por segundo ≈ 3 durante una carrera.
5. **Teclado:** el foco es visible en cabecera, selects, sliders, botones del mapa y reproductor.

- [ ] **Paso 7: commit**

```bash
git add knowledge/adrs/ADR-005-ui-carbon-v12.md knowledge/README.md docs/specs/telemetria.md CLAUDE.md docs/plans/ui-carbon-v12/README.md
git commit -m "docs: ADR-005 y documentación de la interfaz Carbon v12

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
