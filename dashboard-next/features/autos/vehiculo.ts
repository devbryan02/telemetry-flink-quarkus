import type { Map as MapaLibre } from "maplibre-gl"

import type { IndiceColor } from "./paleta"
import { leerToken } from "./tokens"

/**
 * Marcador de auto: círculo con el color del auto y un triángulo de rumbo que apunta al norte (0°);
 * el mapa lo rota según `heading`. El número va aparte, como texto de la capa, para que no gire.
 */
const LADO = 32
const RADIO = 10
const ESCALA = 2 // se dibuja al doble de resolución para pantallas de alta densidad

export type VarianteIcono = IndiceColor | "off"

const VARIANTES: VarianteIcono[] = [1, 2, 3, "off"]

/** Respaldo si el token aún no está en el documento (valores de Carbon G10). */
const POR_DEFECTO: Record<string, string> = { 1: "#6929c4", 2: "#1192e8", 3: "#b28600", off: "#8d8d8d" }

export const nombreIcono = (v: VarianteIcono) => `auto-${v}`

function dibujar(color: string): ImageData {
  const lienzo = document.createElement("canvas")
  lienzo.width = LADO * ESCALA
  lienzo.height = LADO * ESCALA
  const ctx = lienzo.getContext("2d")!
  ctx.scale(ESCALA, ESCALA)
  const centro = LADO / 2

  // triángulo de rumbo, arriba del círculo
  ctx.beginPath()
  ctx.moveTo(centro, 0.5)
  ctx.lineTo(centro + 5, centro - RADIO + 1.5)
  ctx.lineTo(centro - 5, centro - RADIO + 1.5)
  ctx.closePath()
  ctx.fillStyle = color
  ctx.fill()
  ctx.lineWidth = 1.5
  ctx.strokeStyle = "#ffffff"
  ctx.stroke()

  // círculo con borde blanco
  ctx.beginPath()
  ctx.arc(centro, centro, RADIO, 0, Math.PI * 2)
  ctx.fillStyle = color
  ctx.fill()
  ctx.lineWidth = 2.5
  ctx.stroke()

  return ctx.getImageData(0, 0, lienzo.width, lienzo.height)
}

/**
 * Registra las 4 variantes si el estilo actual no las tiene. Un cambio de tema recarga el estilo y las
 * borra; al volver a registrarlas toman los colores del tema nuevo.
 */
export function registrarIconos(mapa: MapaLibre) {
  for (const v of VARIANTES) {
    const nombre = nombreIcono(v)
    if (!mapa.hasImage(nombre)) {
      mapa.addImage(nombre, dibujar(leerToken(`--auto-${v}`, POR_DEFECTO[v])), { pixelRatio: ESCALA })
    }
  }
}
