import { describe, expect, it } from "vitest"

import { crearEstado, reducirCarreras } from "./estado-carreras"
import type { ViajeVista } from "./types"

const viaje = (viajeId: string): ViajeVista => ({ viajeId, carreraId: viajeId, carId: viajeId, rutaId: "av-brasil", companyId: null, fleetId: null, inicioViajeTs: 0, finTs: null, estado: "SIN_CIERRE", motivoFin: null, ultimoTs: 0 })

describe("respuestas de carreras", () => {
  it("un refresco anterior no reemplaza los viajes del día elegido", () => {
    let e = crearEstado("día anterior")
    e = reducirCarreras(e, { tipo: "iniciar", dia: "día anterior", solicitud: 1, modo: "refresco" })
    e = reducirCarreras(e, { tipo: "dia", dia: "día elegido" })
    e = reducirCarreras(e, { tipo: "iniciar", dia: "día elegido", solicitud: 2, modo: "inicial" })
    e = reducirCarreras(e, { tipo: "recibir", dia: "día elegido", solicitud: 2, modo: "inicial", pagina: { items: [viaje("nuevo")], nextCursor: null }, resumenes: new Map() })
    e = reducirCarreras(e, { tipo: "recibir", dia: "día anterior", solicitud: 1, modo: "refresco", pagina: { items: [viaje("viejo")], nextCursor: null }, resumenes: new Map() })
    expect(e.viajes.map(v => v.viajeId)).toEqual(["nuevo"])
  })

  it("un refresco pendiente no borra páginas cargadas después", () => {
    let e = crearEstado("hoy")
    e = reducirCarreras(e, { tipo: "iniciar", dia: "hoy", solicitud: 1, modo: "inicial" })
    e = reducirCarreras(e, { tipo: "recibir", dia: "hoy", solicitud: 1, modo: "inicial", pagina: { items: [viaje("a")], nextCursor: "segunda" }, resumenes: new Map() })
    e = reducirCarreras(e, { tipo: "iniciar", dia: "hoy", solicitud: 2, modo: "refresco" })
    e = reducirCarreras(e, { tipo: "iniciar", dia: "hoy", solicitud: 3, modo: "mas" })
    e = reducirCarreras(e, { tipo: "recibir", dia: "hoy", solicitud: 3, modo: "mas", pagina: { items: [viaje("a"), viaje("b")], nextCursor: null }, resumenes: new Map() })
    e = reducirCarreras(e, { tipo: "recibir", dia: "hoy", solicitud: 2, modo: "refresco", pagina: { items: [viaje("viejo")], nextCursor: "segunda" }, resumenes: new Map() })
    expect(e.viajes.map(v => v.viajeId)).toEqual(["a", "b"])
    expect(e.paginas).toBe(2)
    expect(e.cursor).toBeNull()
  })
})
