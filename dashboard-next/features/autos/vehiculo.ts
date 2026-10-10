import type { Map as MapaLibre } from "maplibre-gl"

/** Ícono de auto visto desde arriba, apuntando al norte (0°); el mapa lo rota según `heading`. */
const ANCHO = 20
const ALTO = 32
const ESCALA = 2 // se dibuja al doble de resolución para pantallas de alta densidad

const COLOR_MOTOR = { on: "#16a34a", off: "#dc2626" } as const
/** Borde blanco para particulares y celeste para autos de empresa (como sus burbujas). */
const COLOR_BORDE = { p: "#ffffff", e: "#38bdf8" } as const

export type Motor = keyof typeof COLOR_MOTOR
export type Tipo = keyof typeof COLOR_BORDE

export const nombreIcono = (motor: Motor, tipo: Tipo) => `vehiculo-${motor}-${tipo}`

function redondeado(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

function dibujar(motor: Motor, tipo: Tipo): ImageData {
  const lienzo = document.createElement("canvas")
  lienzo.width = ANCHO * ESCALA
  lienzo.height = ALTO * ESCALA
  const ctx = lienzo.getContext("2d")!
  ctx.scale(ESCALA, ESCALA)

  // carrocería
  redondeado(ctx, 3, 2, 14, 28, 5)
  ctx.fillStyle = COLOR_MOTOR[motor]
  ctx.fill()
  ctx.lineWidth = 2
  ctx.strokeStyle = COLOR_BORDE[tipo]
  ctx.stroke()
  // parabrisas (adelante, arriba) y luneta
  ctx.fillStyle = "rgba(15, 23, 42, 0.75)"
  redondeado(ctx, 5.5, 8, 9, 5, 1.5)
  ctx.fill()
  redondeado(ctx, 5.5, 22, 9, 3.5, 1.5)
  ctx.fill()
  // faros, para que se lea hacia dónde avanza
  ctx.fillStyle = "#fef08a"
  ctx.fillRect(5, 2.5, 3, 2)
  ctx.fillRect(12, 2.5, 3, 2)

  return ctx.getImageData(0, 0, lienzo.width, lienzo.height)
}

/** Registra las 4 variantes del ícono si el estilo actual no las tiene (un cambio de tema las borra). */
export function registrarIconos(mapa: MapaLibre) {
  for (const motor of ["on", "off"] as Motor[]) {
    for (const tipo of ["p", "e"] as Tipo[]) {
      const nombre = nombreIcono(motor, tipo)
      if (!mapa.hasImage(nombre)) mapa.addImage(nombre, dibujar(motor, tipo), { pixelRatio: ESCALA })
    }
  }
}
