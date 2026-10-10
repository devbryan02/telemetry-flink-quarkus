# 12 · Íconos de vehículo

**Objetivo:** que cada auto que se ve suelto se dibuje como un vehículo, orientado según su rumbo y coloreado por motor.
**Depende de:** 11 · **Spec:** §10

## Alcance
- **Incluye:** capa `symbol` con un ícono SDF, rotación por `heading`, color por `engine`, filtros por empresa y zoom, y popup con empresa y flota.
- **No incluye:** animar la interpolación entre posiciones.

## Tareas
- [ ] SVG propio de auto registrado con `map.addImage(..., { sdf: true })`; se vuelve a registrar si cambia el estilo (tema).
- [ ] Capa `symbol`:
  - `icon-rotate: ["get","heading"]` y `icon-rotation-alignment: "map"`;
  - `icon-color` según `engine`;
  - `icon-allow-overlap: true` y tamaño interpolado por zoom.
- [ ] Filtros sobre la misma fuente:
  - particulares siempre;
  - autos de la empresa seleccionada solo con `zoom ≥ 14`;
  - el resto nunca individualmente.
- [ ] Popup: empresa, flota, motor, batería y antigüedad del dato.

## Archivos
`dashboard-next/features/autos/components/autos-layer.tsx` · `features/autos/vehiculo.ts` (ícono)

## Verificación
Edge headless (CDP):
- particulares como íconos orientados;
- empresa seleccionada con zoom ≥ 14: sus autos como íconos;
- popup con empresa y flota;
- FPS medidos.

## Rama y commit
`feature/inc-12-next-iconos` · `feat(dashboard): dibuja los autos como íconos de vehículo`

## Hecho cuando
Todo auto individual visible es un ícono orientado y coloreado, sin pérdida de fluidez.
