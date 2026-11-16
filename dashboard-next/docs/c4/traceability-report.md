---
okf_version: 0.2
generated: 2026-11-16
verified: false
human-reviewed: false
status: REQUIRES_REVIEW
provenance: agent-generated
sources:
  - ../../features/
  - ../../lib/
  - ../../../knowledge/standards/STD-ARCH-001-arquitectura-por-features.md
c4_level: Sequence
focus_id: dashboard-next-trazabilidad
focus_name: dashboard-next
focus_kind: system
focus_highlight: dark-red-700-border
component_path: dashboard-next
---

# Reporte de trazabilidad

No hay specs ni criterios de aceptación formales (se eliminaron con `docs/`). La trazabilidad parte del **comportamiento observable en el código**.

## Comportamiento → código → pruebas → vistas

| Comportamiento | Código | Pruebas | Vistas |
|---|---|---|---|
| Un evento atrasado no pisa uno más nuevo | `AutosMap.fusionar` | sin prueba directa (la función vive en el componente) | carrera-tiempo-real |
| El movimiento se interpola y no anima saltos grandes | `Animador` | sin prueba directa | carrera-tiempo-real, code |
| El WebSocket reconecta con espera de 1 s hasta 10 s | `useAutosSocket` | sin prueba directa | carrera-tiempo-real |
| La ruta se divide en tramo recorrido y pendiente | `dividirRuta`, `fraccionLider` | ruta-progreso.test.ts | carrera-carga-inicial |
| Los autos se convierten en una fuente GeoJSON | `aGeoJSON` | geojson.test.ts | carrera-tiempo-real |
| El estilo del mapa se recolorea con los grises de Carbon | `recolorear`, `useEstilosMapa` | estilo-mapa.test.ts | carrera-carga-inicial |
| Cada auto tiene un color categórico estable | `paleta`, `indiceColor` | paleta.test.ts | component |
| Una página de viajes se agrupa en carreras con clasificación | `agruparPorCarrera` | carreras.test.ts | viajes-listado |
| Solo la última solicitud del día vigente publica resultados | `reducirCarreras` | estado-carreras.test.ts | viajes-listado |
| El recorrido se ordena, sin `ts` repetidos, con metros acumulados | `prepararRecorrido`, `estadoEn`, `huecos` | repeticion.test.ts | viaje-repeticion |
| Un viaje de más de 50 páginas se rechaza | `listarPosiciones` | api.test.ts | viaje-repeticion |
| La salud acepta 200 y 503 y abre el check de mensajería por canal | `interpretarSalud`, `filasSalud` | salud.test.ts | operacion |
| Las métricas se parsean y la tasa ignora contadores reiniciados | `parsearPrometheus`, `tasaPorSegundo` | prometheus.test.ts | operacion |
| La sección activa y el tema rotan como se espera | `seccionActiva`, `siguienteTema` | secciones.test.ts, tema.test.ts | component |

## Evidencia disponible

- `npm test` (Vitest): 14 archivos y 73 pruebas, todas en verde, ejecutadas el 2026-11-16 sobre `develop` antes de generar este pack.
- Las pruebas cubren funciones puras de `features/` y `lib/`, y `viajes/api.test.ts` con un adaptador de `axios`. **No hay pruebas de componentes, de hooks ni de extremo a extremo.** `npm run lint` y `npm run build` no se ejecutaron para este pack.

## Llamadas a la API → secuencias

Ver la tabla de cobertura en [sequence-e2e.md](sequence-e2e.md).
