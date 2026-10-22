# 02 · Tema Carbon (White / G100)

**Objetivo:** que todos los colores de la app salgan de los temas de Carbon. La clase `dark` de next-themes cambia a la vez Carbon, Tailwind y mapcn.

**Archivos:**
- Modificar: `dashboard-next/app/carbon.scss`.
- Modificar: `dashboard-next/app/globals.css`: se reemplazan los bloques `:root { … }` y `.dark { … }` (hoy en las líneas 57–152).
- Modificar: `dashboard-next/components/theme-provider.tsx` (solo el comentario).

**Interfaces:**
- Consume `app/carbon.scss` (de 01).
- Produce los tokens de la app que usan los incrementos siguientes:

| Token | Para qué |
|---|---|
| `--background`, `--foreground` | fondo y texto |
| `--card` | tarjetas flotantes |
| `--muted`, `--muted-foreground` | filas, chips y texto secundario |
| `--border`, `--input`, `--ring` | bordes, borde de campo y foco |
| `--primary`, `--primary-foreground` | botón principal gris |
| `--field` | fondo de campos |
| `--success`, `--error-text` | estados |
| `--auto-1..3`, `--auto-off` | autos |
| `--ruta-*` | ruta |
| `--header*` | cabecera |

Cada token apunta a un `--cds-*` siempre que existe uno equivalente.

## Pasos

- [x] **Paso 1: tema por clase en `app/carbon.scss`**

Agrega al final del archivo:

```scss
@use '@carbon/react/scss/themes';
@use '@carbon/react/scss/theme';

// Claro = White y oscuro = G100 (la dirección de v12: dos temas). next-themes pone `dark` en <html>
// y mapcn observa la misma clase, así que Carbon, Tailwind y el mapa cambian juntos.
:root {
  @include theme.theme(themes.$white);
}

.dark {
  @include theme.theme(themes.$g100);
}
```

- [x] **Paso 2: tokens de la app desde Carbon en `app/globals.css`**

Reemplaza los bloques `:root { … }` y `.dark { … }` completos (de `:root {` hasta el `}` que cierra `.dark`) por:

```css
/*
 * Tokens de la app sobre los de Carbon (--cds-*). Los que dependen del tema ya cambian solos con .dark;
 * aquí solo se redefinen los que el diseño asigna a una capa distinta en cada tema.
 */
:root {
  --font-plex-sans: "IBM Plex Sans", "Helvetica Neue", Arial, sans-serif;
  --font-plex-mono: "IBM Plex Mono", Menlo, monospace;
  --radius: 0.5rem;
  --background: var(--cds-background);
  --foreground: var(--cds-text-primary);
  --card: var(--cds-background);
  --card-foreground: var(--cds-text-primary);
  --popover: var(--cds-background);
  --popover-foreground: var(--cds-text-primary);
  /* Acción principal gris (botón secundario de Carbon: Gray 80 en claro, Gray 60 en oscuro) */
  --primary: var(--cds-button-secondary);
  --primary-foreground: var(--cds-text-on-color);
  --secondary: var(--cds-layer-selected-01);
  --secondary-foreground: var(--cds-text-primary);
  --muted: var(--cds-layer-01);
  --muted-foreground: var(--cds-text-secondary);
  --accent: var(--cds-layer-hover-01);
  --accent-foreground: var(--cds-text-primary);
  --destructive: var(--cds-support-error);
  --border: var(--cds-border-subtle-00);
  --input: var(--cds-border-strong-01);
  --ring: var(--cds-focus);
  --field: var(--cds-field-01);
  --sombra: 0 2px 12px rgb(0 0 0 / 0.14);
  /* Texto de estado con contraste AA sobre blanco (support-success #24a148 no llega a 4.5:1) */
  --success: #198038;
  --error-text: var(--cds-text-error);
  /* Cabecera G100 en ambos temas */
  --header: #161616;
  --header-foreground: #f4f4f4;
  --header-border: #393939;
  /* Autos: paleta categórica de Carbon en orden (Purple 70, Cyan 50, Teal 70) */
  --auto-1: #6929c4;
  --auto-2: #1192e8;
  --auto-3: #005d5d;
  --auto-off: #8d8d8d;
  --ruta-recorrido: #0f62fe;
  --ruta-pendiente: #a6c8ff;
  --ruta-borde: #ffffff;
}

.dark {
  --card: var(--cds-layer-01);
  --popover: var(--cds-layer-01);
  --muted: var(--cds-layer-02);
  --field: var(--cds-field-02);
  --sombra: 0 2px 12px rgb(0 0 0 / 0.5);
  --success: #42be65;
  /* Paleta categórica para fondo oscuro (Purple 60, Cyan 40, Teal 60) */
  --auto-1: #8a3ffc;
  --auto-2: #33b1ff;
  --auto-3: #007d79;
  --auto-off: #6f6f6f;
  --ruta-recorrido: #78a9ff;
  --ruta-pendiente: #002d9c;
  --ruta-borde: #161616;
}
```

- Elimina del bloque `@theme inline` las líneas de `--color-sidebar*` y `--color-chart-*`: sus tokens ya no existen y nadie los usa (lo confirma `grep -rn "sidebar\|chart-" dashboard-next/{app,components,features}`).
- Agrega `--shadow-flotante: var(--sombra);` dentro de `@theme inline`. Así `shadow-flotante` queda disponible para las tarjetas de 05 y 06.
- Los colores de la ruta cambian a monocromo en 07; aquí solo se mueven.

- [x] **Paso 3: actualizar el comentario de `components/theme-provider.tsx`**

```tsx
/**
 * Tema claro/oscuro con la clase `dark` en `<html>`. Carbon (app/carbon.scss) cambia de White a G100 con
 * esa clase, los tokens de globals.css la siguen y mapcn la observa para cambiar el mapa base.
 */
```

- [x] **Paso 4: verificar**

```bash
npm test && npm run lint && npm run build
```

Esperado: todo en verde.

Después, con `npm run dev` y una carrera en curso (`curl -H 'Content-Type: application/json' -d '{"ruta":"av-brasil"}' localhost:8080/simulacion/iniciar`):
1. **Tema claro:**
   - `getComputedStyle(document.documentElement).getPropertyValue('--cds-background')` da `#ffffff`;
   - el botón *Iniciar/Detener* ya es gris oscuro (usa `bg-primary`).
2. **Tema oscuro** (selector de la cabecera):
   - `--cds-background` da `#161616`;
   - el panel es `#262626` y el mapa base cambia a oscuro;
   - la ruta y los autos se redibujan con los colores oscuros (Review Focus 1).
3. **Volver a claro sin recargar:** no queda ningún color mezclado.

- [x] **Paso 5: commit**

```bash
git add dashboard-next/app/carbon.scss dashboard-next/app/globals.css dashboard-next/components/theme-provider.tsx
git commit -m "feat(dashboard): tokens de la app sobre los temas White y G100 de Carbon

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
