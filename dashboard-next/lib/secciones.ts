export type Seccion = { href: string; nombre: string; disponible: boolean }

/** Secciones de la cabecera. Una sección se muestra cuando su pantalla existe. */
export const SECCIONES: Seccion[] = [
  { href: "/", nombre: "Carrera", disponible: true },
  { href: "/viajes", nombre: "Viajes", disponible: false },
  { href: "/operacion", nombre: "Operación", disponible: false },
]

/** `href` de la sección que contiene la ruta actual; la raíz solo coincide consigo misma. */
export function seccionActiva(pathname: string): string | null {
  if (pathname === "/") return "/"
  const s = SECCIONES.find((x) => x.href !== "/" && (pathname === x.href || pathname.startsWith(`${x.href}/`)))
  return s?.href ?? null
}
