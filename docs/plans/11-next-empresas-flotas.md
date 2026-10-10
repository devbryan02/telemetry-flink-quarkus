# 11 · Dashboard por empresas y flotas

**Objetivo:** no pintar toda la flota de golpe. Se ve una burbuja por empresa; al elegir una empresa, sus flotas; y al acercarse, sus autos.
**Depende de:** 07, 10 · **Spec:** §10

## Alcance
- **Incluye:**
  - agregación por empresa y por flota;
  - burbujas como marcadores de mapcn;
  - selector de empresa;
  - zoom a la empresa o flota elegida;
  - métricas por empresa.
- **No incluye:** íconos de vehículo (12).

## Tareas
- [ ] `types.ts` con `companyId`, `fleetId` y `heading`.
- [ ] `agrupar.ts`: funciones puras que, a partir del `Map<carId, Auto>`, calculan:
  - por empresa: total, % de motor ON, centroide y límites;
  - por flota de la empresa seleccionada: lo mismo.
- [ ] Burbujas con `MapMarker` (`components/ui/map.tsx`), con nombre y total:
  - clic en una empresa: la selecciona y aplica `fitBounds`;
  - clic en una flota: zoom a esa flota.
- [ ] Selector de empresa (`Select` de shadcn) con "Todas las empresas" y la lista con totales, más un botón para quitar la selección.
- [ ] Panel: empresas, flotas y particulares; con una empresa seleccionada, sus autos y % ON.
- [ ] Los resúmenes se recalculan en el `requestAnimationFrame` del repintado y se publican al estado a lo sumo 2 veces por segundo; los autos siguen en `useRef`.

## Archivos
`dashboard-next/features/autos/{types,agrupar}.ts` · `features/autos/components/*` · `components/ui/select.tsx` (shadcn)

## Verificación
Edge headless (CDP):
- sin selección, una burbuja por empresa;
- al seleccionar una empresa, sus flotas y zoom a sus límites;
- capturas como evidencia.

`npm run lint && npm run build` pasan.

## Rama y commit
`feature/inc-11-next-empresas` · `feat(dashboard): vista por empresas y flotas`

## Hecho cuando
El mapa nunca pinta todos los autos de empresa a la vez y se puede navegar empresa → flota.
