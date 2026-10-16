# 06 · Next.js: tiempo real

**Objetivo:** actualizar el mapa en vivo con los lotes del WebSocket, sin congelar la UI.
**Depende de:** 03, 05 · **Spec:** §10 (RF-U3, RF-U5, RF-U6)

## Alcance
- **Incluye:** hook de WebSocket con reconexión, fusión de lotes, repintado por `requestAnimationFrame`, popup en hover, contadores.
- **No incluye:** filtros por zona, historial.

## Tareas
- [ ] `features/autos/hooks/use-autos-socket.ts`: `WebSocket` nativo a `NEXT_PUBLIC_WS_URL`, reconexión con backoff, callback por lote.
- [ ] Estado de los autos en un `Map<carId, Auto>` dentro de `useRef` (no en estado de React); la carga inicial de 05 lo puebla.
- [ ] Cada lote se fusiona por `carId`; un solo `source.setData()` por `requestAnimationFrame`.
- [ ] Popup/tooltip creado solo en `mouseenter` sobre la capa.
- [ ] `autos-stats.tsx` con `Card` de shadcn: autos visibles, lotes/s, edad del último dato (`Date.now() - ts`).
- [ ] Exportar lo público desde `features/autos/index.ts`.

## Archivos
`features/autos/hooks/use-autos-socket.ts` · `features/autos/components/{autos-map,autos-stats}.tsx` · `features/autos/index.ts` · `app/page.tsx`.

## Verificación
```bash
npm run build && npm run dev
curl -s -X POST localhost:8080/simulacion/iniciar
```
Esperado: los puntos se mueven; los contadores se actualizan; al reiniciar Quarkus el cliente se reconecta solo; pestaña Performance de DevTools sin tareas largas por lote.

## Rama y commit
`feature/inc-07-next-tiempo-real` · `feat(dashboard): agrega actualizacion en tiempo real por WebSocket`

## Hecho cuando
Con la simulación en curso el mapa se actualiza en vivo y los contadores son correctos.
