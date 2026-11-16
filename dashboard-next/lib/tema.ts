const ORDEN = ["light", "dark", "system"] as const
export type Tema = (typeof ORDEN)[number]

/** Siguiente tema del botón de la cabecera: claro → oscuro → sistema. */
export function siguienteTema(actual: string | undefined): Tema {
  const i = ORDEN.indexOf(actual as Tema)
  return i === -1 ? "light" : ORDEN[(i + 1) % ORDEN.length]
}
