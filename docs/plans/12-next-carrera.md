# 12 · Dashboard de carrera

**Objetivo:** elegir la ruta, lanzar la carrera, ajustar la velocidad de cada auto y seguir la clasificación hasta la meta desde el dashboard.
**Depende de:** 10, 11 · **Spec:** §10

## Alcance
- **Incluye:**
  - selector de ruta;
  - marcadores de salida y meta;
  - botón de carrera;
  - clasificación con progreso y tiempos;
  - slider de velocidad por auto;
  - seguir al líder.
- **No incluye:** editor de rutas ni más autos.

## Tareas
- [x] `api.ts`: `listarRutas`, `obtenerRuta`, `iniciarCarrera`, `detenerCarrera` y `cambiarVelocidad`.
- [x] `carrera-panel.tsx`:
  - `Select` de ruta (deshabilitado durante la carrera);
  - "Iniciar carrera" / "Detener" / "Nueva carrera";
  - clasificación (posición, empresa · flota, km, barra de progreso, 🏁 tiempo);
  - `Slider` de shadcn por auto (10–500 km/h), enviado al soltar;
  - filtro empresa → flota y métricas.
- [x] `salida-meta.tsx`: marcadores en los extremos de la ruta.
- [x] Al elegir una ruta se dibuja y se encuadra; al entrar se preselecciona la ruta de la carrera actual o de la última.
- [x] `GET /simulacion` cada 1 s durante la carrera y cada 5 s en reposo.
- [x] "Seguir al líder": centra el mapa cada segundo en el primero de la clasificación.
- [x] `animacion.ts`: no anima saltos de más de 2 km (cambio de ruta).

## Archivos
`dashboard-next/features/autos/{api,animacion,types}.ts` · `features/autos/components/{autos-map,carrera-panel,salida-meta}.tsx` · `components/ui/slider.tsx` (shadcn)

## Verificación
`npm run lint && npm run build`. Con Edge headless y clics reales:
- cada ruta se dibuja sobre su vía con Salida y Meta (capturas);
- en la Panamericana Sur, con 60/70/80 km/h, subir el slider de auto-1 a 500 km/h lo lleva del 3º al 1º;
- "Seguir al líder" centra el mapa en él;
- en la Av. Brasil a 500 km/h los tres llegan en 0:37,6 y aparece "Carrera terminada 🏁";
- "Nueva carrera" los devuelve a la salida;
- con Empresa 02 queda 1 de 3 autos;
- sin errores en consola.

## Rama y commit
`feature/inc-17-next-carrera` · `feat(dashboard): selector de ruta, carrera con clasificación y velocidad por auto`

## Hecho cuando
Desde el dashboard se elige cualquiera de las 4 rutas, se corre la carrera ajustando la velocidad de cada auto y se ve la clasificación hasta la meta.
