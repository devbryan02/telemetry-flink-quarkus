# 04 · Quarkus: WebSocket por lotes

**Objetivo:** emitir cada 500 ms un único mensaje con los autos que cambiaron.
**Depende de:** 03 · **Spec:** §9 (RF-Q2, RF-Q3, contrato `WS /ws/autos`)

## Alcance
- **Incluye:** endpoint WebSocket, ticker de 500 ms, vaciado atómico del set de sucios.
- **No incluye:** autenticación, filtros por cliente.

## Tareas
- [ ] `AutosStore.drenarSucios()`: devuelve la lista de autos sucios y limpia el set sin perder actualizaciones concurrentes.
- [ ] `autos/AutosWs` con `@WebSocket(path = "/ws/autos")`.
- [ ] `autos/AutosBroadcaster`: temporizador periódico de Vert.x de 500 ms (`@Scheduled` solo evalúa cada 1 s, no sirve) que drena y hace broadcast de un solo mensaje JSON (array) a todas las conexiones; no envía si el lote está vacío.
- [ ] Test: dos actualizaciones del mismo auto entre ticks producen una sola entrada en el lote.

## Archivos
`.../autos/{AutosWs,AutosBroadcaster}.java` · cambios en `.../autos/AutosStore.java` · test en `src/test`.

## Verificación
```bash
./mvnw test
./mvnw quarkus:dev
npx wscat -c ws://localhost:8080/ws/autos
# en otra terminal, publicar eventos en ultima-posicion
```
Esperado: un mensaje cada ~500 ms con un array solo de los autos cambiados; sin mensajes cuando no hay cambios.

## Rama y commit
`feature/inc-04-quarkus-ws` · `feat(autos): agrega WebSocket con lotes cada 500 ms`

## Hecho cuando
Un cliente `wscat` recibe lotes con el esquema §4 y un auto actualizado varias veces aparece una sola vez por lote.
