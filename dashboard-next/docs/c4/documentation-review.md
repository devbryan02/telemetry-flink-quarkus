---
okf_version: 0.2
generated: 2026-11-16
verified: true
human-reviewed: true
review_date: 2026-11-16
review_evidence: confirmacion expresa del responsable del repositorio en la sesion de Claude Code
status: READY_FOR_DEV
provenance: agent-generated
sources:
  - ../../features/
  - ../../package.json
c4_level: Sequence
focus_id: dashboard-next-revision
focus_name: dashboard-next
focus_kind: system
focus_highlight: dark-red-700-border
component_path: dashboard-next
---

# Revisión de la documentación

**Estado del pack:** `READY_FOR_DEV`. El responsable del repositorio lo revisó y confirmó marcarlo como verificado y revisado el 2026-11-16; la evidencia es esa confirmación expresa en la sesión de Claude Code. `READY_FOR_DEV` no es una auditoría independiente: los puntos abiertos siguen listados abajo.

## Gates de calidad

| Gate | Resultado | Detalle |
|---|---|---|
| Un foco por vista, con borde dark red 700 | ✅ con observación | Los 4 flowcharts y las 8 secuencias definen un único foco. En las secuencias el foco se marca con el alias `R` y el `themeCSS` del `init`; Mermaid 8.10.2 no siempre lo aplica, así que además el participante lleva `· foco` en su nombre. |
| Validación Mermaid | ⚠️ no ejecutada | No se ejecutó un validador ni un render de los 12 diagramas Mermaid. Se escribieron con sintaxis conservadora. |
| Coherencia Context → Container → Component → Code | ✅ | Mismas entidades en todos los niveles: `dashboard-next` → aplicación en el navegador → `features/autos` → `AutosMap`. |
| Code respaldado por código real | ✅ | Todas las funciones y archivos enlazados existen en el repositorio; los enlaces se comprobaron con un script. |
| Secuencias E2E por las capas reales | ✅ | Cada recorrido va de la pantalla al hook o componente, a la función pura, al cliente `axios` o `WebSocket` y a `telemetry-api`, con la vuelta y los errores. |
| Cobertura de las llamadas a la API | ✅ | 13 de 13 llamadas (12 REST y 1 WebSocket) aparecen en al menos una secuencia. No aplica «una secuencia por endpoint»: el dashboard es un cliente, no una API. |
| Arquitectura con fuente | ✅ | `STD-ARCH-001` (por features) y `ADR-005` (Carbon v12); se cumple en el código. |
| Seguridad | ⚠️ sin controles | No hay autenticación ni sesión. Depende de CORS en `telemetry-api`. Las URL son `NEXT_PUBLIC_*`, públicas por definición, y no hay secretos. |
| Observabilidad | ⚠️ limitada | La pantalla Operación muestra salud y métricas de la API, pero el dashboard no reporta errores propios ni envía correlation ID; los errores se muestran en pantalla. |
| Errores | ✅ | Cada secuencia lista los mensajes que ve el usuario y los códigos del backend que los originan. |
| Enlaces fuente válidos | ✅ (comprobado) | Ver la sección «Verificación de enlaces». |
| Dependencias inventadas | ✅ ninguna | OpenFreeMap y CARTO salen de `use-estilos-mapa.ts` y `map.tsx`; la UI de Flink, de `operacion-pantalla.tsx`. |
| Ubicación | ✅ | `dashboard-next/docs/c4/` (COMPONENT_MODE con `component_path` explícito). |

## Divergencias encontradas en el código

1. **Contrato del frontend atrasado respecto al backend.** `telemetry-api` devuelve `viajeId` en cada `Clasificado` y `carreraId` en `EstadoSimulacion`; los tipos de [`autos/types.ts`](../../features/autos/types.ts) no los declaran y la pantalla Carrera no los usa.
2. **Textos que citan documentación que ya no existe.** [`operacion-pantalla.tsx`](../../features/operacion/components/operacion-pantalla.tsx) menciona el runbook `docs/test-cases/persistencia-posiciones-viajes.md`, y varios comentarios y el [`README.md`](../../README.md) del dashboard remiten a `spec §10`, `spec §4` y `docs/specs/telemetria.md`. Esos archivos se eliminaron del repositorio.
3. **Texto de la UI desactualizado.** La notificación de Operación dice «Si un consumidor JDBC falla»; desde `ADR-007` la persistencia usa Hibernate y Panache.
4. **Copias entre features.** `features/viajes` repite `listarRutas`, `ResumenRuta` y `distancia.ts` que ya existen en `features/autos`. Es coherente con la regla de no importar internos de otra feature, pero hay que mantener ambas copias.
5. **`components/ui/map.tsx`** (generado por mapcn, 2696 líneas) es el archivo más grande del frontend y solo se importan `Map`, `MapRef`, `useMap`, `MapMarker` y `MarkerContent`.
6. **Dos proveedores de mapa base.** El estilo propio sale de OpenFreeMap; si falla, mapcn usa CARTO. Ambos son externos y se consultan desde el navegador.
7. **Sondeos periódicos.** `GET /simulacion` cada 1 s con la carrera en curso (5 s en reposo), `GET /viajes` y los resúmenes cada 5 s mientras haya una carrera en curso, y salud y métricas cada 5 s en Operación. Con varios usuarios la carga sobre la API crece linealmente.
8. **Sin pruebas de componentes, de hooks ni de extremo a extremo.** Las 73 pruebas son de funciones puras y de un cliente; `fusionar`, `Animador` y `useAutosSocket` no tienen prueba directa.
9. **Flags experimentales** en `next.config.ts` (`cacheComponents`, `partialPrefetching`, `experimental.agentFeedback`); todas las pantallas obtienen sus datos en el cliente, así que no se verificó qué efecto real tienen.
10. **Sin autenticación ni sesión.**

## Verificación de enlaces

Script ad hoc del 2026-11-16 sobre `docs/c4/**/*.md`: 182 enlaces relativos y 63 fuentes de frontmatter, 0 rotos. 12 diagramas, cada uno como bloque en su `.md` y como archivo `.mmd`, con exactamente un foco (comprobado), y el `.mmd` de cada secuencia coincide con el bloque de su `.md` (comprobado).

## Pendiente y decisiones tomadas

- [x] Revisión humana: confirmada por el responsable del repositorio el 2026-11-16.
- [ ] Ejecutar una validación Mermaid sobre los diagramas (no se ejecutó).
- [ ] Opcional: corregir las divergencias 1 a 3.
