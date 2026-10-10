# 10 · Dashboard: botón de simulación, filtro empresa → flota y ruta

**Objetivo:** iniciar la simulación desde el dashboard, ver la Av. Brasil y filtrar los autos por empresa y flota, viéndolos circular sin saltos.
**Depende de:** 08, 09 · **Spec:** §10

## Alcance
- **Incluye:** botón de simulación, dos selectores (empresa y flota), capa de la ruta, filtro sobre la capa de autos y movimiento interpolado.
- **No incluye:** selector de escenario.

## Tareas
- [x] `api.ts`: `obtenerRuta`, `obtenerSimulacion`, `iniciarSimulacion` y `detenerSimulacion` con axios.
- [x] Botón "Iniciar simulación" / "Detener simulación" con el estado de `GET /simulacion`, consultado cada 5 s.
- [x] `filtros.ts`: empresas y flotas presentes en los datos (con su número de autos), `cumpleFiltro` y la expresión de filtro de MapLibre.
- [x] Dos `Select` de shadcn: empresa ("Todas las empresas") y flota (deshabilitado sin empresa). La capa de autos aplica `setFilter`.
- [x] `ruta-layer.tsx`: la Av. Brasil como capa `line` debajo de los autos; vista encuadrada en la ruta.
- [x] `animacion.ts`: interpola posición y rumbo entre eventos y repinta por frame mientras algún auto está en camino.

## Archivos
`dashboard-next/features/autos/{api,filtros,animacion,types}.ts` · `features/autos/components/{autos-map,autos-layer,autos-stats,ruta-layer}.tsx`

## Verificación
`npm run lint && npm run build`. Con Edge headless y clics reales:
- iniciar → 3 autos avanzando sobre la ruta;
- Empresa 01 → 2/3; Empresa 01 · Flota 1 → 2/3; Empresa 02 → 1/3; Todas → 3/3;
- detener;
- sin errores en consola.

## Rama y commit
`feature/inc-14-filtro-empresa-flota` · `feat(dashboard): filtro por empresa y flota, ruta y botón de simulación`

## Hecho cuando
Desde el dashboard se inicia y detiene la simulación, y el filtro deja en el mapa solo los autos de la empresa o flota elegida.
