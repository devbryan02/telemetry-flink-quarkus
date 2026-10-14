# 07 · Empresa, flota y rumbo en el contrato

**Objetivo:** que cada evento lleve la empresa, la flota y el rumbo del auto, y que el job y el backend lo transporten sin cambiar su lógica.
**Depende de:** 04 · **Spec:** §4, §8, §9

## Alcance
- **Incluye:** campos `companyId`, `fleetId` y `heading` en `flink/Posicion` y `autos/Auto`, tests y compatibilidad con eventos sin esos campos.
- **No incluye:** endpoints nuevos (el frontend agrega desde el estado completo).

## Tareas
- [x] `Posicion` y `Auto` con `companyId`, `fleetId` y `heading`.
- [x] El deserializador de Flink ignora propiedades desconocidas.
- [x] Tests: el job conserva los campos; un evento sin ellos se acepta con `null`/0.
- [x] `scripts/crear-topics.* --recrear` para reiniciar los topics cuando cambia el contrato (`ultima-posicion` compactado guarda eventos con el formato anterior).

## Archivos
`telemetry-api/src/main/java/dev/bryan/{flink/Posicion,flink/PosicionJson,autos/Auto}.java` · tests de ambas features · `scripts/crear-topics.*`

## Verificación
```bash
cd telemetry-api && ./mvnw test
curl -s -X POST localhost:8080/simulacion/iniciar
curl -s localhost:8080/autos | jq '.[0]'      # incluye companyId, fleetId, heading
```

## Rama y commit
`feature/inc-10-contrato-flotas` · `feat(autos): transporta empresa, flota y rumbo de cada auto`

## Hecho cuando
`GET /autos` y el WebSocket devuelven los 9 campos y los tests pasan.
