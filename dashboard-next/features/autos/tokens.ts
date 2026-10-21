/** Color de una variable CSS del tema, para capas de MapLibre (que no entienden `var(--x)`). */
export function leerToken(nombre: string, porDefecto: string): string {
  if (typeof window === "undefined") return porDefecto
  return getComputedStyle(document.documentElement).getPropertyValue(nombre).trim() || porDefecto
}
