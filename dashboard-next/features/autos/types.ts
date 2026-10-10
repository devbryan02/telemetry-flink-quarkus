/** Última posición de un auto (spec §4). */
export type Auto = {
  carId: string
  /** Empresa dueña del auto; `null` en los autos particulares */
  companyId: string | null
  /** Flota dentro de la empresa; `null` en los autos particulares */
  fleetId: string | null
  lat: number
  lon: number
  /** Rumbo en grados desde el norte, sentido horario */
  heading: number
  engine: "ON" | "OFF"
  battery: number
  /** Epoch ms UTC del evento */
  ts: number
}

/** Estado de la simulación en el backend (`GET /simulacion`). */
export type EstadoSimulacion = {
  enCurso: boolean
  escenario: string
  autos: number
  /** ISO-8601; `null` si está detenida */
  desde: string | null
}
