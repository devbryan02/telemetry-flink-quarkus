# 08 · Pruebas de carga y aceptación

**Objetivo:** medir el sistema completo contra los objetivos de la spec y cerrar los criterios de aceptación.
**Depende de:** 05, 07 · **Spec:** §11, §12, §14

## Alcance
- **Incluye:** pruebas 1–4, registro de resultados, checklist §14.
- **No incluye:** optimizaciones; si algo falla se abre un incremento nuevo.

## Tareas
- [ ] Línea base de Kafka: `kafka-producer-perf-test.sh` (comando en spec §11) y anotar el techo.
- [ ] Ejecutar 10 minutos cada una: prueba 1 (1.000 autos), 2 (5.000), 3 (10.000), 4 (20.000, estrés) con `simulador.py --autos N --intervalo 2`.
- [ ] En cada prueba medir: ev/s del simulador, lag de `flink-ultima-pos` y `quarkus-dash` (`kafka-consumer-groups.sh --describe`), backpressure en `:8081`, latencia p95 en el navegador (`Date.now() - ts`), FPS (DevTools), CPU y memoria (`docker stats` y heap de la JVM).
- [ ] Registrar resultados en `docs/plans/resultados-carga.md` con tabla medido vs objetivo.
- [ ] Recorrer el checklist de spec §14 y marcar cada criterio con su evidencia.

## Archivos
`docs/plans/resultados-carga.md` · opcionalmente `scripts/medir-lag.sh`.

## Verificación
Objetivos con 10.000 autos: ≥ 4.900 ev/s · lag < 1.000 · sin backpressure · p95 < 2 s · ≥ 30 FPS · `GET /autos` devuelve 10.000 registros.

## Rama y commit
`feature/inc-08-pruebas-carga` · `docs(pruebas): registra resultados de carga y criterios de aceptacion`

## Hecho cuando
Todos los criterios de §14 están marcados con evidencia, o cada incumplimiento tiene un incremento nuevo documentado.
