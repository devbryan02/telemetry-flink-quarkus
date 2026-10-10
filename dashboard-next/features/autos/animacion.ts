import type { Auto } from "./types"

/** Si dos eventos de un auto llegan más separados que esto, no se interpola (salta a la posición nueva). */
const DURACION_MAXIMA_MS = 3_000
const DURACION_MINIMA_MS = 200
/** Un salto mayor (p. ej. al empezar una carrera en otra ruta) no se anima: el auto aparece en su sitio. */
const SALTO_MAXIMO_M = 2_000

function metros(a: Pick<Auto, "lat" | "lon">, b: Pick<Auto, "lat" | "lon">): number {
  const dy = (b.lat - a.lat) * 111_320
  const dx = (b.lon - a.lon) * 111_320 * Math.cos((a.lat * Math.PI) / 180)
  return Math.hypot(dx, dy)
}

type Tramo = {
  desde: Pick<Auto, "lat" | "lon" | "heading">
  hasta: Auto
  inicio: number
  duracion: number
}

/** Diferencia de ángulo por el camino corto (-180..180]. */
function deltaAngulo(de: number, a: number): number {
  return ((a - de + 540) % 360) - 180
}

/**
 * Suaviza el movimiento: entre dos eventos de un auto (≈1 s) lo desplaza en línea recta y gira por el
 * camino corto, para que en el mapa circule en vez de saltar.
 */
export class Animador {
  private tramos = new Map<string, Tramo>()

  /** Registra la posición nueva de un auto; parte desde donde se está mostrando ahora. */
  actualizar(auto: Auto, ahora: number): void {
    const anterior = this.tramos.get(auto.carId)
    if (!anterior) {
      this.tramos.set(auto.carId, { desde: auto, hasta: auto, inicio: ahora, duracion: 0 })
      return
    }
    const intervalo = auto.ts - anterior.hasta.ts
    const desde = this.posicion(anterior, ahora)
    const salto = intervalo > DURACION_MAXIMA_MS || metros(desde, auto) > SALTO_MAXIMO_M
    const duracion = salto ? 0 : Math.max(DURACION_MINIMA_MS, intervalo)
    this.tramos.set(auto.carId, { desde, hasta: auto, inicio: ahora, duracion })
  }

  /** La flota tal como debe dibujarse en este instante. */
  *posiciones(ahora: number): Iterable<Auto> {
    for (const tramo of this.tramos.values()) yield { ...tramo.hasta, ...this.posicion(tramo, ahora) }
  }

  /** Posición mostrada ahora de un auto, o `null` si no se conoce. */
  posicionDe(carId: string, ahora: number): Pick<Auto, "lat" | "lon"> | null {
    const t = this.tramos.get(carId)
    return t ? this.posicion(t, ahora) : null
  }

  /** Si algún auto todavía está en camino hacia su última posición. */
  enMovimiento(ahora: number): boolean {
    for (const t of this.tramos.values()) if (ahora - t.inicio < t.duracion) return true
    return false
  }

  private posicion(t: Tramo, ahora: number): Pick<Auto, "lat" | "lon" | "heading"> {
    const f = t.duracion === 0 ? 1 : Math.min(1, (ahora - t.inicio) / t.duracion)
    return {
      lat: t.desde.lat + (t.hasta.lat - t.desde.lat) * f,
      lon: t.desde.lon + (t.hasta.lon - t.desde.lon) * f,
      heading: (t.desde.heading + deltaAngulo(t.desde.heading, t.hasta.heading) * f + 360) % 360,
    }
  }
}
