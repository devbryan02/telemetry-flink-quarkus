# Cierre de UI Carbon v12

Fecha: 2026-10-22. Rama: `feature/inc-23-carbon-v12`.

Se implementaron los incrementos del [plan](../plans/ui-carbon-v12/README.md): Carbon con flag v12, temas White/G100, Carrera flotante, mapa gris, Viajes por carrera, Repetición y Operación. El backend y `components/ui/map.tsx` permanecen sin cambios. La decisión está en [ADR-005](../../knowledge/adrs/ADR-005-ui-carbon-v12.md).

## Verificación

| Comprobación | Resultado |
|---|---|
| `npm test` | 73 pruebas en 14 archivos, todas pasan |
| `npm run lint` | Sin errores |
| `npm run build` en Windows | Correcto; incluye las cuatro rutas |
| Docker/Linux | Imagen reconstruida y contenedor iniciado; `/`, `/viajes` y `/operacion` responden 200 |
| API, PostgreSQL y Kafka | Salud de los servicios correcta; readiness 200/UP |
| Grafo | `graphify update .`: 1453 nodos y 2743 aristas; parser SQL instalado |
| Carrera, Chrome 1440×900 | Panel sin scroll: contenido y altura de 739 px; campos de velocidad dentro de la tarjeta |
| Carrera, Chrome 390×844 | Sin desbordamiento horizontal; mapa de unos 506 px de alto |
| Controles | Envío de velocidad al soltar el ratón y al salir con el teclado; foco y selector de tema operativos |
| Mapa | OpenFreeMap disponible; al simular fallo de descarga conserva Carto; tema claro/oscuro sin errores de página |
| Viajes | Tarjetas, clasificación, filtros, estado vacío y navegación móvil; filas adaptables sin desbordamiento |
| Respuestas tardías | Refresco retenido y liberado tras cambiar fecha o cargar más: no sustituye los resultados vigentes |
| Repetición | Inicio en pausa, play/pausa/final, ±10 s, cambio de auto, huecos y viaje inexistente |
| Operación, fallo simulado | HTTP 503 muestra DOWN y el detalle del canal, sin confundirlo con fallo de red |
| Carrera real en Docker | Versión final: cambio de velocidad confirmado en API, Seguir al líder, filtro, readiness UP, carrera finalizada, historial y repetición a 16× con cambio a oscuro; sin errores de página |

Los errores HTTP 503 se verificaron con respuestas controladas del contrato real de SmallRye Health y con pruebas de interpretación; no se detuvo PostgreSQL. El recorrido integrado real usa Kafka, Flink, PostgreSQL y la API existentes.

La revisión final independiente detectó cinco problemas importantes: navegación móvil ausente, campo de velocidad recortado, respuestas de otra fecha, filas de Viajes desbordadas y repetición truncada silenciosamente. Se corrigieron en una sola pasada, con regresiones que fallaron antes del cambio y después pasaron. El límite exclusivo de fecha también se corrigió contra el contrato Java. La actualización de estado de reproducción dentro del updater fue examinada y no se encontró un fallo observable que requiriera cambiarla.

## Decisiones tomadas

Cada decisión conserva su motivo y el coste si debe cambiarse:

1. **R1 — Tipos de conexión compatibles estructuralmente.** El hook y la cabecera conservan sus tipos; TypeScript comprueba que coincidan. Coste: un cambio incompatible obliga a ajustar ambos.
2. **R2 — Exigir el flag v12 real.** Se comprobó en Carbon 1.119.0 y se usa `enableV12Release` en React. Coste: una actualización sin ese flag requiere revisar la integración.
3. **R3 — Continuar en la rama existente.** Se conserva el checkout dedicado del usuario. Coste: no se crea un segundo worktree.
4. **R4 — Precompilar Sass con su CLI.** Resuelve los imports transitivos que Turbopack no resolvía en Windows. Coste: paso adicional en `predev`/`prebuild`; tras editar Sass con dev abierto hay que ejecutar `npm run carbon:css`.
5. **R5 — Ordenar las capas CSS.** Carbon se importa en `@layer carbon`, antes de las utilidades. Coste: conservar ese orden al agregar estilos.
6. **R6 — Capturar la salida del thumb del Slider.** Carbon solo notificaba blur del campo numérico; el contenedor lee el valor accesible del control. Coste: adaptación a ese contrato DOM, cubierta en navegador.
7. **R7 — Preservar la altura móvil del mapa.** Se evita que flex reduzca sus 60dvh. Coste: la página móvil se desplaza verticalmente.
8. **R8 — Reiniciar el día antes de pintar datos anteriores.** El ajuste inicial de estado evolucionó al reducer de R16. Coste: un render de ajuste al cambiar de fecha.
9. **R9 — Suspense para fecha y parámetros.** Cache Components requiere una frontera al leer la fecha actual y `useParams`. Coste: fallback breve de carga.
10. **R10 — Remontar el reproductor por viaje.** Reinicia solicitudes, mapa y reproducción al cambiar de auto. Coste: recrear el mapa en esa navegación.
11. **R11 — Lag máximo finito por canal.** La API publica series por partición y puede incluir `NaN`; se agrega el máximo de las válidas. Coste: recorrer las series de cada canal.
12. **R12 — Conservar identificadores de requisitos.** RF-U13 ya era Controles del mapa; Viajes, Repetición y Operación usan RF-U14/15/16. Coste: numeración diferente a la propuesta en el brief.
13. **R13 — Autoría de commits veraz.** Esta continuación no atribuye cambios a un modelo que no los implementó. Coste: los trailers difieren de la plantilla del plan.
14. **R14 — Respetar `hasta` exclusivo.** Se usa la medianoche siguiente, sin restar un milisegundo, porque la API consulta `< hasta`. Coste: corregir la expectativa equivocada del brief.
15. **R15 — Informar del límite de muestras.** Se conservan 50 páginas de hasta 1000 muestras; si hay más, aparece un error explícito y no se presenta un recorrido parcial como completo. Se añadió una prueba determinista del cliente con adaptador de red. Coste: los viajes mayores al límite no se reproducen; Vitest incorpora esa prueba de cliente además de las funciones puras.
16. **R16 — Identificar y cancelar las solicitudes.** Un reducer puro acepta solo la respuesta de la consulta vigente; cargar más invalida un refresco anterior. Coste: un módulo de estado adicional, con dos pruebas de regresión.
17. **R17 — Limitar los estilos universales heredados.** Los bordes propios se aplican a clases de layout; Carbon conserva sus bordes transparentes y foco. Coste: las tarjetas propias deben declarar sus clases de borde.
18. **R18 — Verificar DOWN con un 503 controlado.** Se prueba el contrato real de salud sin detener PostgreSQL compartido. Coste: esta sesión no induce una caída real de la base de datos; readiness UP y el recorrido completo sí se verifican con servicios reales.

## Menor diferido (resuelto)

Los controles del mapa usaban los **48×48 px** predeterminados de Carbon v12; el brief indicaba 40×40 px. Se resolvió con `size="md"` en los cuatro `IconButton` de `controles-mapa.tsx`: en Docker miden 40×40 px, siguen siendo circulares y no tapan la leyenda. No quedan hallazgos pendientes.

## Panel de la carrera igual al diseño

Revisión posterior al cierre: con una carrera en curso, el panel hacía scroll porque cada fila llevaba la etiqueta de velocidad en su propia línea, el mínimo y el máximo del slider y un campo numérico de 48 px. Se igualó al diseño `Moderno-Carrera`:
- velocidad en una sola línea, con la etiqueta "Velocidad", el slider y una píldora `N km/h`;
- estado en un `Tag`; "bloqueada durante la carrera" dentro de la etiqueta de la ruta;
- select y botones de 40 px.

Además se corrigió un fallo previo: Carbon llama a `onChange` cuando cambia la prop `value`, y ese eco del sondeo quedaba como borrador. Desde entonces, la fila dejaba de reflejar los cambios de velocidad hechos por otro cliente.

| Comprobación (Docker, Chrome 1440×900, carrera en curso) | Resultado |
|---|---|
| Panel | 614 px de alto, sin scroll; filas de 104 px; mínimo y máximo ocultos |
| Cambio externo por `PUT` | La fila pasa a 175 y vuelve a 170 sin recargar |
| Teclado (flechas y salir del control) | La API recibe el nuevo valor y la fila lo conserva |
| Tema oscuro | Tag, píldoras y slider legibles |

## Repetir la verificación

Desde `dashboard-next/`, ejecutar `npm test`, `npm run lint` y `npm run build`. Desde la raíz, `docker compose up -d --build --no-deps dashboard`, con el backend ya saludable, y abrir `http://localhost:3000`.

Iniciar una carrera de Av. Brasil; cambiar una velocidad con teclado y ratón, activar Seguir al líder y filtrar una empresa. Comprobar Viajes y Operación durante la carrera. Al terminar, abrir un auto y reproducir a 16×, cambiar de tema y de participante. En 390×844, abrir el menú de secciones y comprobar la clasificación completa. Para provocar fallos de readiness, usar un entorno desechable o una respuesta controlada de 503; no es necesario detener la base de datos de trabajo.
