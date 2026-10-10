/** Última posición de un auto (spec §4). */
export type Auto = {
  carId: string
  lat: number
  lon: number
  engine: "ON" | "OFF"
  battery: number
  /** Epoch ms UTC del evento */
  ts: number
}
