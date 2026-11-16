# ADR-005: Interfaz con Carbon Design System (flag v12) en lugar de shadcn/ui

**Estado:** Aceptado · **Fecha:** 2026-10-22 · **Detalle:** `docs/specs/telemetria.md` §10 · **Reemplaza:** «shadcn/ui» del frontend en `ADR-003`

El dashboard usa Carbon Design System de IBM:

- **Componentes:** `@carbon/react` e íconos de `@carbon/icons-react`. shadcn/ui y sus dependencias (`@base-ui/react`, `class-variance-authority`, `tw-animate-css`) se retiraron.
- **Flag v12:** `enable-v12-release` activo en Sass (`app/carbon.scss`) y en React (`components/flags-carbon.tsx`): botones en píldora, botones de ícono circulares, campos con borde y esquinas de 8 px.
- **Temas:** White (claro) y G100 (oscuro), por la clase `dark` de next-themes. Los tokens de la app (`globals.css`) apuntan a `--cds-*`.
- **Acción principal gris:** `kind="secondary"` de Carbon (Gray 80 / Gray 60). El color lo ponen los datos (autos y estados); el azul queda en enlaces y foco.
- **Tailwind 4:** solo para layout, sin preflight; el reset es el de Carbon.
- **Tipografía:** IBM Plex con Fontsource, porque Carbon pide la familia literal «IBM Plex Sans».
- **Mapa:** mapcn (MapLibre) se conserva con su `components/ui/map.tsx` y `lucide-react`. El mapa base son los tiles de OpenFreeMap con un estilo recoloreado con los grises de Carbon.
- **Sin estilo de IA de Carbon:** Carbon lo reserva para contenido generado por IA.

Límites que se aceptan:

- **v12 todavía no es estable:** el flag activa una dirección visual en *preview* que puede cambiar entre versiones menores de `@carbon/react`. La versión queda fijada en `package-lock.json`. Al actualizarla hay que revisar las pantallas.
- **Dependencia de OpenFreeMap:** el mapa base depende de un servicio externo gratuito; si falla, mapcn vuelve a Carto.
- **Componentes propios:** algunos (tarjetas de carrera, chips de métricas, gráfico de velocidad) son propios con tokens de Carbon, porque Carbon no los ofrece.

En Windows, Turbopack no resuelve algunos imports Sass transitivos de Carbon. `predev` y `prebuild` compilan `carbon.scss` con el CLI de Sass a `carbon.generated.css` (ignorado por Git). `carbon.css` lo importa dentro de `@layer carbon` para que las utilidades de layout puedan prevalecer sobre el reset.
