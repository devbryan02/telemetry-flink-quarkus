# 08 · Íconos de vehículo

**Objetivo:** que cada auto se dibuje como un vehículo, orientado según su rumbo y coloreado por motor.
**Depende de:** 06, 07 · **Spec:** §10 (RF-U5, RF-U8)

## Alcance
- **Incluye:** capa `symbol` con íconos de auto dibujados en canvas, rotación por `heading`, color por `engine`, borde por tipo (particular/empresa) y popup con empresa y flota.
- **No incluye:** el filtro por empresa/flota ni la interpolación del movimiento (10).

## Tareas
- [x] Ícono de auto dibujado en canvas a 2x, en 4 variantes (motor ON/OFF × particular/empresa), registrado con `map.addImage`. Se usa canvas y no un ícono SDF teñido con `icon-color` porque así los bordes quedan nítidos. Se vuelve a registrar si cambia el estilo (tema).
- [x] Capa `symbol`:
  - `icon-rotate: ["get","heading"]` y `icon-rotation-alignment: "map"`;
  - `icon-image` según `engine` y tipo (verde/rojo; borde blanco o celeste);
  - `icon-allow-overlap: true` y tamaño interpolado por zoom.
- [x] Popup: auto, empresa, flota, motor, batería y antigüedad del dato.

## Archivos
`dashboard-next/features/autos/components/autos-layer.tsx` · `features/autos/vehiculo.ts`

## Verificación
Edge headless (CDP): íconos orientados según el rumbo y coloreados por motor; popup con empresa y flota.

## Rama y commit
`feature/inc-12-next-iconos` · `feat(dashboard): dibuja los autos como íconos de vehículo`

## Hecho cuando
Todo auto visible es un ícono orientado y coloreado.
