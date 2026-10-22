# 08 · Retirar shadcn

**Objetivo:** que no quede nada de shadcn: componentes generados, `components.json`, dependencias e imports CSS. En el código propio, los íconos pasan a ser de Carbon.

`components/ui/map.tsx` (mapcn) **se conserva**, y con él `lucide-react` y el paquete `cn` que usa.

**Archivos:**
- Eliminar:
  - `dashboard-next/components/ui/{badge,button,card,select,slider,tooltip}.tsx`;
  - `dashboard-next/components.json`.
- Modificar:
  - `dashboard-next/app/layout.tsx` (sin `TooltipProvider`);
  - `dashboard-next/app/globals.css` (líneas 2–3);
  - `dashboard-next/features/autos/components/salida-meta.tsx` (íconos);
  - `dashboard-next/package.json` y `package-lock.json`.

**Interfaces:** ninguna nueva. Al terminar, ningún archivo propio importa `@/components/ui/*`, salvo `@/components/ui/map`.

## Pasos

- [ ] **Paso 1: comprobar que no queda ningún uso**

```bash
cd dashboard-next
grep -rn "components/ui/\(badge\|button\|card\|select\|slider\|tooltip\)" app components features lib
```

Esperado: solo `app/layout.tsx` (el `TooltipProvider`). Si aparece otro archivo, pásalo a Carbon antes de seguir; los incrementos 03–06 debían cubrirlos todos.

- [ ] **Paso 2: íconos de Carbon en `salida-meta.tsx`**

Cambia el import de la línea 4:

```tsx
import { Flag, PlayFilledAlt } from "@carbon/icons-react"
```

y los dos íconos:

```tsx
            icono={<PlayFilledAlt size={12} />}
```

```tsx
            icono={<Flag size={12} />}
```

Después:

```bash
grep -rln "lucide-react" app components features lib
```

Esperado: solo `components/ui/map.tsx`.

- [ ] **Paso 3: sin `TooltipProvider` en `app/layout.tsx`**

Borra `import { TooltipProvider } from "@/components/ui/tooltip"` y cambia:

```tsx
          <FlagsCarbon>
            <TooltipProvider>{children}</TooltipProvider>
          </FlagsCarbon>
```

por:

```tsx
          <FlagsCarbon>{children}</FlagsCarbon>
```

Los tooltips de Carbon (`IconButton`, `HeaderGlobalAction`) no necesitan proveedor.

- [ ] **Paso 4: borrar archivos, imports CSS y dependencias**

```bash
git rm components/ui/badge.tsx components/ui/button.tsx components/ui/card.tsx \
  components/ui/select.tsx components/ui/slider.tsx components/ui/tooltip.tsx components.json
npm uninstall shadcn @base-ui/react class-variance-authority tw-animate-css
```

En `app/globals.css`, borra las líneas:

```css
@import "tw-animate-css";
@import "shadcn/tailwind.css";
```

- [ ] **Paso 5: verificar**

```bash
npm test && npm run lint && npm run build
grep -rn "base-ui\|class-variance-authority\|shadcn" app components features lib package.json
```

Esperado:
- tests, lint y build en verde;
- `grep` no imprime nada.

Si el build falla porque `map.tsx` usaba una animación de `tw-animate-css` (por ejemplo `animate-in`), restaura solo esa dependencia y anótalo en el commit. No edites `map.tsx`.

En el navegador:
- la carrera funciona igual que en 07: tooltips, selects, sliders y botones;
- los marcadores de salida y meta muestran sus íconos.

- [ ] **Paso 6: commit**

```bash
git add -A dashboard-next/components/ui dashboard-next/components.json
git add dashboard-next/app/layout.tsx dashboard-next/app/globals.css \
  dashboard-next/features/autos/components/salida-meta.tsx dashboard-next/package.json dashboard-next/package-lock.json
git commit -m "refactor(dashboard): retirar shadcn; la interfaz queda en Carbon

Se conserva components/ui/map.tsx (mapcn) con lucide-react.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
