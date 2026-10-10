# 07 · Next.js: tiempo real

**Objetivo:** actualizar el mapa en vivo con los lotes del WebSocket, sin congelar la UI.
**Depende de:** 04, 06 · **Spec:** §10 (RF-U3, RF-U5, RF-U6)

## Alcance
- **Incluye:** hook de WebSocket con reconexión, fusión de lotes, repintado por `requestAnimationFrame`, popup en hover, contadores.
- **No incluye:** filtros por zona, historial.

## Tareas
- [ ] `features/autos/hooks/use-autos-socket.ts`: `WebSocket` nativo a `NEXT_PUBLIC_WS_URL`, reconexión con backoff, callback por lote.
- [ ] Estado de los autos en un `Map<carId, Auto>` dentro de `useRef` (no en estado de React); la carga inicial de 06 lo puebla.
- [ ] Cada lote se fusiona por `carId`; un solo `source.setData()` por `requestAnimationFrame`.
- [ ] Popup/tooltip creado solo en `mouseenter` sobre la capa.
- [ ] `autos-stats.tsx` con `Card` de shadcn: autos visibles, lotes/s, edad del último dato (`Date.now() - ts`).
- [ ] Exportar lo público desde `features/autos/index.ts`.

## Archivos
`features/autos/hooks/use-autos-socket.ts` · `features/autos/components/{autos-map,autos-stats}.tsx` · `features/autos/index.ts` · `app/page.tsx`.

## Verificación
```bash
npm run build && npm run dev
python simulador/simulador.py --autos 1000 --intervalo 2
```
Esperado: los puntos se mueven; los contadores se actualizan; al reiniciar Quarkus el cliente se reconecta solo; pestaña Performance de DevTools sin tareas largas por lote.

## Rama y commit
`feature/inc-07-next-tiempo-real` · `feat(dashboard): agrega actualizacion en tiempo real por WebSocket`

## Hecho cuando
Con 1.000 autos el mapa se actualiza fluido y los contadores son correctos; la carga con 10.000 se valida en el incremento 08.
