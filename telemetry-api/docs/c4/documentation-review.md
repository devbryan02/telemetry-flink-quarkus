---
okf_version: 0.2
generated: 2026-11-16
verified: false
human-reviewed: false
status: REQUIRES_REVIEW
provenance: agent-generated
sources:
  - ../../src/main/java/dev/bryan/
  - ../../pom.xml
c4_level: Sequence
focus_id: telemetry-api-revision
focus_name: telemetry-api
focus_kind: system
focus_highlight: dark-red-700-border
component_path: telemetry-api
---

# Revisión de la documentación

**Estado del pack:** `REQUIRES_REVIEW`. No se emite `READY_FOR_DEV`: falta la revisión humana (`human-reviewed: false`), los endpoints no vienen de una especificación OpenAPI y los diagramas no se validaron con Mermaid.

## Gates de calidad

| Gate | Resultado | Detalle |
|---|---|---|
| Un foco por vista, con borde dark red 700 | ✅ con observación | Los 4 flowcharts y las 13 secuencias definen un único foco. En las secuencias el foco se marca con el alias `R` y el `themeCSS` del `init`; Mermaid 8.10.2 no siempre lo aplica, así que además el participante lleva `· foco` en su nombre. |
| Validación Mermaid | ⚠️ no ejecutada | No se ejecutó un validador ni un render de los 17 diagramas Mermaid. Se escribieron con la sintaxis compatible con Mermaid 8.10.2 (sin llaves ni punto y coma en mensajes). |
| Coherencia Context → Container → Component → Code | ✅ | Mismas entidades en todos los niveles: `telemetry-api` → Flink en la misma JVM, `kafka`, `postgres` → capas hexagonales → `SimulacionService`. |
| Code respaldado por código real | ✅ | Todas las clases enlazadas existen en `src/main/java`; los enlaces se comprobaron con un script (ver abajo). |
| Secuencias E2E por las capas reales | ✅ | Cada secuencia recorre recurso o consumidor → puerto de entrada → servicio → dominio → puerto de salida → adaptador → PostgreSQL, Kafka o classpath. |
| Una secuencia por endpoint | ⚠️ `REQUIRES_REVIEW` | 10 de 10 endpoints cubiertos, pero derivados de los recursos REST (`INFERRED`): no hay especificación OpenAPI ni Swagger en `telemetry-api/src`. |
| Arquitectura con fuente | ✅ | `ADR-006` (hexagonal), `ADR-007` (Panache), `ADR-004` (esquema) y `ArquitecturaHexagonalTest`. |
| Seguridad | ⚠️ sin controles | El servicio no tiene autenticación ni autorización; solo CORS al origen del dashboard. Las credenciales de PostgreSQL vienen del `.env` (no versionado). |
| Observabilidad | ✅ con observación | Readiness `/q/health/ready` y métricas `/q/metrics`: `viajes_eventos_{insertados,duplicados,legados,invalidos}`, `viajes_persistencia_fallos`, `autos_persistencia_fallos`, `viajes_sin_cierre` y el binder de Kafka. No hay correlation ID de entrada: el `requestId` solo existe en los errores. |
| Errores | ✅ | Las ramas `alt` usan los códigos reales: `RUTA_REQUERIDA`, `RUTA_NO_ENCONTRADA`, `VELOCIDAD_INVALIDA`, `AUTO_NO_ENCONTRADO`, `INVALID_BBOX`, `CONSULTA_VIAJES_INVALIDA`, `VIAJE_NO_ENCONTRADO` e `INTERNAL_ERROR`. |
| Enlaces fuente válidos | ✅ (comprobado) | Ver la sección «Verificación de enlaces». |
| Dependencias inventadas | ✅ ninguna | Kafka y PostgreSQL salen de `docker-compose.yml`, `pom.xml` y `application.properties`. No se documenta Prometheus ni otro cliente que el repo no despliega. |
| Ubicación | ✅ | `telemetry-api/docs/c4/` (COMPONENT_MODE con `component_path` explícito). |

## Divergencias encontradas en el código

1. **Sin especificación OpenAPI.** Decidir si se publica una con `quarkus-smallrye-openapi` o se acepta formalmente la derivación desde los recursos.
2. **Adaptador de salida que depende de uno de entrada.** `ViajesStore` (out) importa `EventoJson` de `in/messaging/viajes` para revalidar los eventos. `ArquitecturaHexagonalTest` solo prohíbe `in` → `out`, así que no lo detecta.
3. **`EventoJson` triplicado** en `in/messaging/autos`, `in/messaging/viajes` e `infrastructure/flink`. Es coherente con la regla de no acoplar capacidades, pero cualquier cambio del contrato v2 hay que replicarlo en las tres copias.
4. **Clases públicas por las pruebas.** `AutosCambios` y `ViajesStore` son `public` para que las pruebas de otros paquetes y `MetricasMicrometer` las usen; `SimulacionService.avanzar` también es público.
5. **Código que solo usan las pruebas:** `AutoDeserializer` (el canal usa `AutoEventoDeserializer`) y `Bbox.contiene` (el filtro de `bbox` ahora es una consulta).
6. **Catálogo de rutas:** si falta `rutas/indice.json` o el escenario, responde 404 `RUTA_NO_ENCONTRADA` y no 500, porque reutiliza el mismo error. Solo una falla de lectura produce 500.
7. **Un fallo de publicación en Kafka no llega al cliente:** `POST /simulacion/iniciar` responde 200 y el error solo queda en el log del publicador.
8. **Sin autenticación ni autorización** en ningún endpoint ni en el WebSocket.
9. **Latencia p95** no medida en este pack.

## Verificación de enlaces

Script ad hoc del 2026-11-16 sobre `docs/c4/**/*.md`: 261 enlaces relativos y 80 fuentes de frontmatter, 0 rotos. 17 diagramas, cada uno como bloque en su `.md` y como archivo `.mmd`, cada diagrama con exactamente un foco (comprobado), y el `.mmd` de cada secuencia coincide con el bloque de su `.md` (comprobado).

## Pendiente para `READY_FOR_DEV`

- [ ] Revisión humana identificada del pack.
- [ ] Decidir si se publica OpenAPI o se acepta la derivación desde los recursos.
- [ ] Ejecutar una validación Mermaid sobre los diagramas.
- [ ] Opcional: corregir las divergencias 2 a 5 y 7.
