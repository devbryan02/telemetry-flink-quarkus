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

/** Ruta establecida (`GET /rutas`). */
export type ResumenRuta = {
  id: string
  nombre: string
  desde: string
  hasta: string
  km: number
}

export type EstadoCarrera = "LISTA" | "EN_CURSO" | "TERMINADA"

/** Un auto en la clasificación de la carrera. */
export type Clasificado = {
  posicion: number
  carId: string
  companyId: string | null
  fleetId: string | null
  velocidadKmh: number
  recorridoM: number
  /** Tiempo de carrera al cruzar la meta; `null` mientras corre */
  llegadaMs: number | null
}

/** Estado de la carrera en el backend (`GET /simulacion`). */
export type EstadoSimulacion = {
  estado: EstadoCarrera
  /** Ruta de la carrera actual o de la última; `null` antes de la primera */
  ruta: string | null
  /** ISO-8601 */
  inicio: string | null
  longitudM: number
  autos: Clasificado[]
}
