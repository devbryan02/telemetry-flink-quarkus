# 13 · Modo claro y oscuro

**Objetivo:** que toda la interfaz (mapa, panel, controles, popup y marcadores) admita modo claro y oscuro, elegible desde el dashboard.
**Depende de:** 12 · **Spec:** §10 (RF-U12)

## Alcance
- **Incluye:**
  - `next-themes`;
  - selector Claro / Oscuro / Sistema;
  - estilos con tokens de shadcn;
  - mapa base que sigue el tema.
- **No incluye:** temas de color adicionales.

## Tareas
- [x] `next-themes` con `ThemeProvider` (`attribute="class"`, `defaultTheme="system"`) y `suppressHydrationWarning` en `<html>`.
- [x] `components/selector-tema.tsx`: tres botones de ícono (`Sun`, `Moon`, `Monitor`) en la cabecera del panel. El estado activo se marca solo tras montar, para no desajustar la hidratación.
- [x] Popup de los autos con `bg-popover` y `text-popover-foreground` (mapcn deja transparente el contenedor de MapLibre); marcador de Meta con `bg-foreground` y `text-background`; textos verdes con variante `dark:`.
- [x] El mapa base de mapcn sigue la clase `dark` de `<html>`, y la ruta, los íconos y la fuente de autos se recrean al cambiar el estilo.

## Archivos
`dashboard-next/components/{theme-provider,selector-tema}.tsx` · `app/layout.tsx` · `features/autos/components/{carrera-panel,autos-layer,salida-meta}.tsx` · `package.json`

## Verificación
`npm run lint && npm run build`. Con Edge headless (CDP):
- en "Sistema" sigue `prefers-color-scheme` (oscuro y claro emulados);
- "Oscuro" y "Claro" cambian el mapa y el panel;
- el cambio en plena carrera mantiene la ruta, Salida/Meta y los autos;
- el tema persiste tras recargar;
- el popup en oscuro tiene fondo oscuro y texto claro;
- sin avisos de hidratación en consola.

## Rama y commit
`feature/inc-18-tema-claro-oscuro` · `feat(dashboard): modo claro y oscuro en toda la interfaz`

## Hecho cuando
Toda la interfaz se ve coherente en claro y en oscuro, y el tema se elige y se recuerda desde el dashboard.
