---
okf_version: 0.2
generated: 2026-10-10
verified: false
human-reviewed: false
status: REQUIRES_REVIEW
provenance: agent-generated
sources:
  - ./README.md
  - ../specs/telemetria.md
  - ../../telemetry-api/src/main/java/dev/bryan/
  - ../../dashboard-next/features/autos/
c4_level: Context
focus_id: sistema-telemetria
focus_name: Sistema de telemetría de carreras
focus_kind: system
focus_highlight: dark-red-700-border
component_path: .
---

# Revisión de la documentación

**Estado del pack:** `REQUIRES_REVIEW`. No se emite `READY_FOR_DEV`: falta la especificación OpenAPI y la revisión humana (`human-reviewed: false`).

## Gates de calidad

| Gate | Resultado | Detalle |
|---|---|---|
| Un foco por vista, con borde dark red 700 | ✅ con observación | Los flowcharts usan `classDef focus` (verificado con un render en Edge). En las secuencias, Mermaid 8.10.2 no aplica el `themeCSS` del `init` ni pone `name` en `rect.actor`, así que el borde rojo solo aparece con Mermaid moderno. Como respaldo, el participante foco lleva «· foco» en su etiqueta. |
| Validación Mermaid 8.10.2 (`check_mermaid.js`) | ✅ | 38 bloques (19 diagramas, en `.md` y `.mmd`), 0 fallos. Todos los `classDef` tienen `fill`, `stroke` y `color`, con ≤ 12 nodos por flowchart. |
| Coherencia Context → Container → Component → Code | ✅ | Mismas entidades en todos los niveles: sistema → `telemetry-api` → `simulacion` → `Simulador`. |
| Code respaldado por código real | ✅ | Todas las clases y módulos enlazados existen. |
| Secuencias E2E por las capas reales | ✅ | J1 recorre dashboard → REST → simulación → Kafka → Flink → Kafka → store → WebSocket → mapa. |
| Una secuencia por endpoint REST | ⚠️ `REQUIRES_REVIEW` | 7/7 operaciones cubiertas más el WebSocket, pero derivadas de los controllers (`INFERRED`). No hay `openapi:` ni `swagger:` en `telemetry-api/src/**/*.y{a,}ml`. |
| Arquitectura con fuente | ✅ | Por features (`STD-ARCH-001`, `ADR-003`). No hay ports explícitos; la tabla de equivalencia de capas es `INFERRED`. |
| Seguridad | ✅ documentada | Sin autenticación ni autorización por diseño (RNF-5); CORS solo para `http://localhost:3000`. |
| Observabilidad | ⚠️ parcial | Logs de JBoss Logging, `requestId` solo en respuestas de error, UI de Flink en `:8081` y métricas de latencia en el panel. No hay correlation ID de extremo a extremo (ni en las respuestas 2xx ni en Kafka), ni extensiones `smallrye-health` o métricas. El healthcheck de Docker usa `GET /rutas`. |
| Errores | ✅ | Ramas `alt` con los códigos reales: `RUTA_REQUERIDA`, `RUTA_NO_ENCONTRADA`, `VELOCIDAD_INVALIDA`, `AUTO_NO_ENCONTRADO`, `INVALID_BBOX`, `HTTP_<status>` e `INTERNAL_ERROR`. |
| Enlaces fuente válidos | ✅ | Comprobados con un script: todos los enlaces relativos resuelven. |
| Dependencias inventadas | ✅ ninguna | CARTO sale de `components/ui/map.tsx`; OSM/OSRM, de la spec §5, marcado como fuente no runtime. |
| Ubicación | ✅ | `docs/c4/` (PRODUCT_MODE, sin `component_path`, directorio de documentación del proyecto). |

## Divergencias encontradas (no se modificó código ni spec)

1. **Árbol de la spec §12 incompleto:**
   - en `autos/` faltan `Bbox`, `AutoDeserializer` y `ReconstruirEstadoListener`;
   - en `flink/` falta `PosicionJson`;
   - en el dashboard faltan `geojson.ts`, `metricas.ts` y `autos-dashboard.tsx`.
2. **Javadoc de `AutosConsumer`** menciona "5.000 msg/s", un objetivo de carga que ya no forma parte del alcance.
3. **Javadoc de `Auto`** habla de "autos particulares" con `companyId` y `fleetId` `null`; el escenario actual (`carrera.json`) solo tiene autos de empresa. El tipo lo admite, pero no se ejerce.
4. **`CatalogoRutas`:** si falta `rutas/indice.json` responde 404 `RUTA_NO_ENCONTRADA` y no 500, porque reutiliza `noEncontrada`.

## Pendiente para `READY_FOR_DEV`

- [ ] Revisión humana identificada del pack.
- [ ] Decidir si se publica una especificación OpenAPI (p. ej. con `quarkus-smallrye-openapi`) o se acepta formalmente la derivación desde los controllers.
- [ ] Opcional: corregir las divergencias 1–3.
