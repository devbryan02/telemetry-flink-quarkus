# 10 · Contrato nuevo en Flink y Quarkus

**Objetivo:** que el job y el backend transporten `companyId`, `fleetId` y `heading` sin cambiar su lógica.
**Depende de:** 05, 09 · **Spec:** §4, §8, §9

## Alcance
- **Incluye:** campos nuevos en `flink/Posicion` y `autos/Auto`, tests actualizados, compatibilidad con eventos sin los campos nuevos.
- **No incluye:** endpoints nuevos (el frontend agrega desde el estado completo).

## Tareas
- [ ] `Posicion` y `Auto` con `companyId`, `fleetId` y `heading`.
- [ ] El deserializador de Flink ignora propiedades desconocidas (hoy un campo nuevo descartaría el evento).
- [ ] Tests: el job conserva los campos; un evento sin ellos se acepta con `null`/0.
- [ ] Recrear los topics antes de probar: `ultima-posicion` compactado guarda eventos viejos sin empresa.

## Archivos
`telemetry-api/src/main/java/dev/bryan/{flink/Posicion,flink/PosicionJson,autos/Auto}.java` · tests de ambas features · `scripts/crear-topics.*`

## Verificación
```bash
cd telemetry-api && ./mvnw test
python simulador/simulador.py --autos 1000 --semilla 7
curl -s localhost:8080/autos | jq '.[0]'      # incluye companyId, fleetId, heading
```

## Rama y commit
`feature/inc-10-contrato-flotas` · `feat(autos): transporta empresa, flota y rumbo de cada auto`

## Hecho cuando
`GET /autos` y el WebSocket devuelven los 9 campos y los tests pasan.
