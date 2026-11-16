import type { EstadoViaje, ResumenViaje, ViajeVista } from "./types"

export type EstadoCarrera = "EN_CURSO" | "TERMINADA" | "DETENIDA"
export type Participante = {
  viajeId: string
  carId: string
  companyId: string | null
  fleetId: string | null
  estado: EstadoViaje
  posicion: number
  duracionMs: number | null
  distanciaM: number | null
  velocidadMediaKmh: number | null
  /** Solo finalizados: tiempo perdido contra el ganador (0 el primero) */
  diferenciaMs: number | null
  /** Solo no finalizados: metros contra el que va más adelante (0 o negativo) */
  diferenciaM: number | null
}
export type Carrera = {
  clave: string
  carreraId: string | null
  rutaId: string
  inicioTs: number
  estado: EstadoCarrera
  participantes: Participante[]
}

const porCarId = (a: { carId: string }, b: { carId: string }) => a.carId.localeCompare(b.carId, "es", { numeric: true })

function participante(v: ViajeVista, r: ResumenViaje | undefined): Participante {
  const duracionMs = r?.duracionViajeMs ?? (v.finTs !== null ? v.finTs - v.inicioViajeTs : null)
  return {
    viajeId: v.viajeId,
    carId: v.carId,
    companyId: v.companyId,
    fleetId: v.fleetId,
    estado: v.estado,
    posicion: 0,
    duracionMs,
    distanciaM: r?.distanciaObservadaM ?? null,
    velocidadMediaKmh: r?.velocidadMediaObservadaKmh ?? null,
    diferenciaMs: null,
    diferenciaM: null,
  }
}

function clasificar(ps: Participante[]): Participante[] {
  const llegaron = ps.filter((p) => p.estado === "FINALIZADO")
  const resto = ps.filter((p) => p.estado !== "FINALIZADO")
  llegaron.sort((a, b) => (a.duracionMs ?? Infinity) - (b.duracionMs ?? Infinity) || porCarId(a, b))
  resto.sort((a, b) => (b.distanciaM ?? -Infinity) - (a.distanciaM ?? -Infinity) || porCarId(a, b))
  const ganador = llegaron[0]?.duracionMs ?? null
  const masLejos = Math.max(...ps.map((p) => p.distanciaM ?? -Infinity))
  return [...llegaron, ...resto].map((p, i) => ({
    ...p,
    posicion: i + 1,
    diferenciaMs: p.estado === "FINALIZADO" && ganador !== null && p.duracionMs !== null ? p.duracionMs - ganador : null,
    diferenciaM: p.estado !== "FINALIZADO" && p.distanciaM !== null ? p.distanciaM - masLejos : null,
  }))
}

function estadoDe(ps: Participante[]): EstadoCarrera {
  if (ps.some((p) => p.estado === "SIN_CIERRE")) return "EN_CURSO"
  if (ps.some((p) => p.estado === "DETENIDO")) return "DETENIDA"
  return "TERMINADA"
}

/** Una página de viajes como carreras con clasificación; la más reciente primero. */
export function agruparPorCarrera(viajes: ViajeVista[], resumenes: Map<string, ResumenViaje>): Carrera[] {
  const grupos = new Map<string, ViajeVista[]>()
  for (const v of viajes) {
    if (v.estado === "REEMPLAZADO") continue
    const clave = v.carreraId ?? `viaje:${v.viajeId}`
    grupos.set(clave, [...(grupos.get(clave) ?? []), v])
  }
  return [...grupos]
    .map(([clave, vs]) => {
      const participantes = clasificar(vs.map((v) => participante(v, resumenes.get(v.viajeId))))
      return {
        clave,
        carreraId: vs[0].carreraId,
        rutaId: vs[0].rutaId,
        inicioTs: Math.min(...vs.map((v) => v.inicioViajeTs)),
        estado: estadoDe(participantes),
        participantes,
      }
    })
    .sort((a, b) => b.inicioTs - a.inicioTs)
}
