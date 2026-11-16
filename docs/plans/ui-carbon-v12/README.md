# UI Carbon v12: de shadcn a Carbon Design System — incrementos

Los 14 incrementos están implementados. [Verificación, decisiones y menor visual diferido](../../test-cases/ui-carbon-v12.md).

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** reemplazar shadcn/ui por Carbon Design System (`@carbon/react`) con el flag de v12 activado, y llevar al dashboard el diseño moderno aprobado: Carrera sin scroll, Viajes por carrera con repetición y Operación.

**Architecture:**
- **Alcance:** el cambio vive solo en `dashboard-next/`; el backend no cambia.
- **Estilos y tema:**
  - Carbon entra por Sass (`app/carbon.scss`) con el flag `enable-v12-release`. El tema White va en `:root` y el G100 en `.dark`, la misma clase que ya usan next-themes y mapcn.
  - Tailwind se queda solo para el layout (sin preflight). Los colores salen de los tokens `--cds-*`.
- **Lógica:** las reglas nuevas son funciones puras con tests de Vitest:
  - agrupar los viajes por carrera;
  - calcular velocidades, huecos y la posición en la repetición;
  - leer las métricas de Prometheus;
  - recolorear el mapa base.
- **Mapa:** mapcn (MapLibre) se conserva, con un mapa base gris propio.

**Tech Stack:**
- Next.js 16.4, React 19.3, `@carbon/react` (v11 con flag v12), `@carbon/icons-react`, `sass`, Fontsource IBM Plex;
- mapcn + MapLibre 6, Tailwind 4 (solo utilidades), next-themes, axios, Vitest.

**Spec:**
- [Telemetría §10](../../specs/telemetria.md) y [persistencia de posiciones y viajes](../../specs/persistencia-posiciones-viajes.md) (API de viajes).
- Diseño aprobado, fila "Carbon v12 moderno" del canvas https://claude.ai/artifact/2koWXhTTD5mgNuozmZYzMz: `project/Moderno-Carrera.dc.html`, `Moderno-Viajes.dc.html`, `Moderno-Viaje.dc.html` y `Moderno-Operacion.dc.html`.

## Secuencia y entregables

| # | Plan | Depende de | Entregable verificable |
|---|---|---|---|
| 01 | [Base Carbon con flag v12](01-base-carbon-v12.md) | — | Carbon compila junto a shadcn; un `Button` de Carbon redondeado |
| 02 | [Tema Carbon](02-tema-carbon.md) | 01 | Los tokens de la app salen de White/G100; cambiar el tema sigue funcionando |
| 03 | [UI Shell](03-ui-shell.md) | 02 | Cabecera Carbon con secciones por ruta y selector de tema |
| 04 | [Controles de la carrera](04-controles-carrera.md) | 03 | Ruta, botones grises, seguir líder y velocidades con Carbon |
| 05 | [Carrera sin scroll](05-carrera-sin-scroll.md) | 04 | Filtros y métricas en una barra sobre el mapa; el panel no hace scroll a 1440×900 |
| 06 | [Controles y leyenda del mapa](06-controles-leyenda-mapa.md) | 05 | Botones circulares y leyenda en tarjetas de 8 px |
| 07 | [Mapa base gris](07-mapa-base-gris.md) | 02 | OpenFreeMap recoloreado con grises de Carbon; ruta monocroma |
| 08 | [Retirar shadcn](08-retirar-shadcn.md) | 03–07 | Sin `components/ui` de shadcn ni sus dependencias |
| 09 | [Datos de viajes](09-datos-viajes.md) | — | Cliente de `/viajes` y agrupación por carrera, con tests |
| 10 | [Pantalla Viajes](10-pantalla-viajes.md) | 03, 09 | `/viajes`: tarjetas por carrera con clasificación |
| 11 | [Cálculos de la repetición](11-calculos-repeticion.md) | 09 | Velocidad entre muestras, huecos e interpolación, con tests |
| 12 | [Pantalla Repetición](12-pantalla-repeticion.md) | 07, 10, 11 | `/viajes/[viajeId]`: mapa, reproductor y gráfico de velocidad |
| 13 | [Operación](13-operacion.md) | 03 | `/operacion`: salud, flujo y métricas |
| 14 | [Documentación y cierre](14-documentacion-cierre.md) | 01–13 | Spec, CLAUDE.md, ADR-005, Docker y grafo al día |

- **Orden recomendado:** 01 → 02 → 03 → 04 → 05 → 06 → 07 → 08 → 09 → 10 → 11 → 12 → 13 → 14.
- **Se pueden paralelizar:** 09 y 11 (no tocan UI); 13 (solo necesita la cabecera de 03).

## Global Constraints

- Todo en español (código, comentarios, commits y docs), como el resto del repo.
- **Organización por features (STD-ARCH-001):**
  - las features son `features/autos/`, `features/viajes/` (nueva) y `features/operacion/` (nueva), cada una con su `index.ts` público;
  - `app/` solo importa de esos `index.ts`;
  - una feature no importa los archivos internos de otra, solo su `index.ts`;
  - la cabecera y el tema van en `components/`.
- **Carbon:**
  - componentes de `@carbon/react` y la versión que instale npm, fijada en `package-lock.json`;
  - flag `enable-v12-release` activo en Sass y en React.
  - No usar el estilo de IA de Carbon (AI label, degradados).
- **Botones:**
  - acción principal con `kind="secondary"`: es el gris Gray 80 en claro y Gray 60 en oscuro;
  - `kind="danger"` solo para acciones destructivas, que hoy no existen;
  - sin `kind="primary"` azul.
  - El azul queda en enlaces y foco.
- **Color:** siempre por token: `var(--cds-*)` o los tokens de la app (`--auto-N`, `--ruta-*`), nunca hex en componentes. MapLibre lee los colores con `leerToken`.
- **Componentes de mapcn:**
  - `components/ui/map.tsx` se conserva tal cual (lo genera mapcn); por eso se mantienen `lucide-react` y `lib/utils.ts`.
  - En el código propio se usan los íconos de `@carbon/icons-react`.
- **Accesibilidad:**
  - contraste ≥ 4.5:1 para texto;
  - botones de ícono con `label`;
  - respetar `prefers-reduced-motion` en la repetición y en las transiciones.
- **Tests:** Vitest solo para funciones puras (`features/**/*.test.ts`, entorno node). Primero se escribe el test y se ve fallar; después se implementa.
- **Verificación base de cada incremento:** `cd dashboard-next && npm test && npm run lint && npm run build`, todo en verde.
- **Git (STD-GIT-001):**
  - rama `feature/inc-23-carbon-v12`, sacada de `feature/inc-22-ui-carbon` porque inc-22 aún no está en `develop`;
  - un commit Conventional Commits por incremento, solo con los archivos del incremento (nunca `git add .`);
  - cada mensaje termina con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`;
  - sin PR.
- **Docker:** `docker compose up -d --build dashboard` al cerrar. Nunca `down -v`.

## Review Focus

1. **Cambiar de tema con la carrera en curso:**
   - Carbon (variables `--cds-*` de `.dark`) y MapLibre (estilo recargado) deben quedar en el mismo tema;
   - la ruta, los autos y la etiqueta del líder se vuelven a dibujar con los colores nuevos.
   - Se prueba en 02, 07 y 12.
2. **Viajes sin `carreraId` o de una carrera incompleta:**
   - pasa con eventos legados, viajes REEMPLAZADO o con una página que corta una carrera a la mitad;
   - `agruparPorCarrera` no debe romperse ni duplicar tarjetas. Test en 09.
3. **Posiciones con el mismo `ts`, desordenadas o una sola muestra:**
   - la velocidad no puede dar `Infinity` ni `NaN`;
   - la interpolación con una muestra devuelve esa muestra. Tests en 11.
4. **La API responde 503 en `/q/health/ready` (canal caído):**
   - la pantalla Operación muestra DOWN y el detalle, no un error genérico;
   - axios no debe tratar el 503 como fallo de red. Test de `interpretarSalud` en 13.
5. **Ventana de 1440×900 y celular:**
   - el panel de Carrera no hace scroll a 1440×900;
   - en el celular todo se apila y el mapa conserva altura. Es un paso de verificación en 05.
