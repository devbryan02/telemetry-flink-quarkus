/** Colores categóricos de Carbon por auto; los valores están en globals.css (`--auto-1..3`). */
export const CANTIDAD_COLORES = 3

export type IndiceColor = 1 | 2 | 3

/**
 * `auto-N` (N ≥ 1) → ((N-1) mod 3) + 1; cualquier otro id (sin número, `-0` o un número enorme) →
 * hash estable, para que nunca quede sin color.
 */
export function indiceColor(carId: string): IndiceColor {
  const n = Number(/-(\d+)$/.exec(carId)?.[1])
  const base =
    Number.isSafeInteger(n) && n >= 1 ? n - 1 : [...carId].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 0)
  return ((base % CANTIDAD_COLORES) + 1) as IndiceColor
}

export const varColor = (carId: string) => `var(--auto-${indiceColor(carId)})`
