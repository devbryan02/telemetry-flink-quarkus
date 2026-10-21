import { metros } from "./distancia"
import type { EstadoSimulacion } from "./types"

/** `[lon, lat]`, como en GeoJSON. */
export type Coordenada = [number, number]

const punto = ([lon, lat]: Coordenada) => ({ lon, lat })

/**
 * Corta la línea de la ruta en la fracción recorrida por el líder. Ambos tramos comparten el punto
 * de corte para que no quede un hueco entre las dos capas.
 */
export function dividirRuta(linea: Coordenada[], fraccion: number): { recorrido: Coordenada[]; pendiente: Coordenada[] } {
  const f = Math.min(1, Math.max(0, fraccion))
  const largos = linea.slice(1).map((c, i) => metros(punto(linea[i]), punto(c)))
  let restante = f * largos.reduce((a, b) => a + b, 0)
  for (let i = 0; i < largos.length; i++) {
    if (restante <= largos[i] || i === largos.length - 1) {
      const t = largos[i] === 0 ? 0 : Math.min(1, restante / largos[i])
      const [a, b] = [linea[i], linea[i + 1]]
      const corte: Coordenada = t === 1 ? b : t === 0 ? a : [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
      // con t = 1 el corte es el vértice siguiente: no se duplica en el tramo recorrido
      const recorrido = t === 1 ? linea.slice(0, i + 2) : [...linea.slice(0, i + 1), corte]
      const pendiente = [corte, ...linea.slice(t === 1 ? i + 2 : i + 1)]
      // una LineString necesita al menos dos puntos
      return { recorrido, pendiente: pendiente.length > 1 ? pendiente : [corte, corte] }
    }
    restante -= largos[i]
  }
  return { recorrido: [linea[0], linea[0]], pendiente: linea }
}

/** Avance del primero (0..1) en la ruta elegida; 0 si la carrera es de otra ruta. */
export function fraccionLider(simulacion: EstadoSimulacion | null, rutaSeleccionada: string | null): number {
  if (!simulacion || simulacion.ruta !== rutaSeleccionada || simulacion.longitudM <= 0) return 0
  const maximo = Math.max(0, ...simulacion.autos.map((a) => a.recorridoM))
  return Math.min(1, maximo / simulacion.longitudM)
}
