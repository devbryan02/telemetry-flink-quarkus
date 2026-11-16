import type { Pagina, ResumenViaje, ViajeVista } from "./types"

export type ModoCarga = "inicial" | "refresco" | "mas"
type Estado = {
  dia: string
  viajes: ViajeVista[]
  resumenes: Map<string, ResumenViaje>
  cursor: string | null
  paginas: number
  solicitud: number
  cargando: boolean
  error: string | null
}
type Consulta = { dia: string; solicitud: number }
type Accion =
  | { tipo: "dia"; dia: string }
  | (Consulta & { tipo: "iniciar"; modo: ModoCarga })
  | (Consulta & { tipo: "recibir"; modo: ModoCarga; pagina: Pagina<ViajeVista>; resumenes: Map<string, ResumenViaje> })
  | (Consulta & { tipo: "error"; mensaje: string })

export function crearEstado(dia: string): Estado {
  return { dia, viajes: [], resumenes: new Map(), cursor: null, paginas: 0, solicitud: 0, cargando: true, error: null }
}

/** Solo la última solicitud del día vigente puede publicar sus resultados. */
export function reducirCarreras(e: Estado, a: Accion): Estado {
  if (a.tipo === "dia") return a.dia === e.dia ? e : crearEstado(a.dia)
  if (a.dia !== e.dia) return e
  if (a.tipo === "iniciar") return { ...e, solicitud: a.solicitud, cargando: a.modo !== "refresco", error: null }
  if (a.solicitud !== e.solicitud) return e
  if (a.tipo === "error") return { ...e, cargando: false, error: a.mensaje }
  const ampliar = a.modo === "mas"
  const viajes = ampliar ? [...e.viajes, ...a.pagina.items] : a.pagina.items
  return {
    ...e,
    viajes: [...new Map(viajes.map(v => [v.viajeId, v])).values()],
    resumenes: ampliar ? new Map([...e.resumenes, ...a.resumenes]) : a.resumenes,
    cursor: a.pagina.nextCursor,
    paginas: ampliar ? e.paginas + 1 : 1,
    cargando: false,
    error: null,
  }
}
