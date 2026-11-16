import { describe, expect, it } from "vitest"

import { agruparPorCarrera } from "./carreras"
import type { ResumenViaje, ViajeVista } from "./types"

const C1 = "11111111-1111-1111-1111-111111111111"
const C2 = "22222222-2222-2222-2222-222222222222"

function viaje(p: Partial<ViajeVista> & Pick<ViajeVista, "viajeId" | "carId">): ViajeVista {
  return {
    carreraId: C1, rutaId: "av-brasil", companyId: "emp-01", fleetId: "emp-01-f1",
    inicioViajeTs: 1_000, finTs: null, estado: "SIN_CIERRE", motivoFin: null, ultimoTs: 2_000, ...p,
  }
}
function resumen(distanciaM: number, duracionViajeMs: number | null = null): ResumenViaje {
  return {
    cantidadMuestras: 10, ultimoTs: 0, duracionObservadaMs: 0, duracionViajeMs,
    distanciaObservadaM: distanciaM, velocidadMediaObservadaKmh: 60, maxIntervaloMuestrasMs: 1_000,
  }
}

describe("agruparPorCarrera", () => {
  it("ordena a los que llegaron por tiempo y calcula la diferencia con el ganador", () => {
    const viajes = [
      viaje({ viajeId: "a", carId: "auto-1", estado: "FINALIZADO", finTs: 1_000 + 312_000 }),
      viaje({ viajeId: "b", carId: "auto-3", estado: "FINALIZADO", finTs: 1_000 + 234_000 }),
      viaje({ viajeId: "c", carId: "auto-2", estado: "FINALIZADO", finTs: 1_000 + 267_000 }),
    ]
    const [c] = agruparPorCarrera(viajes, new Map())
    expect(c.estado).toBe("TERMINADA")
    expect(c.participantes.map((p) => [p.carId, p.posicion, p.diferenciaMs])).toEqual([
      ["auto-3", 1, 0],
      ["auto-2", 2, 33_000],
      ["auto-1", 3, 78_000],
    ])
  })

  it("en curso ordena por distancia y da la diferencia en metros con el que va adelante", () => {
    const viajes = [viaje({ viajeId: "a", carId: "auto-1" }), viaje({ viajeId: "b", carId: "auto-3" })]
    const r = new Map([["a", resumen(2_570)], ["b", resumen(3_420)]])
    const [c] = agruparPorCarrera(viajes, r)
    expect(c.estado).toBe("EN_CURSO")
    expect(c.participantes.map((p) => [p.carId, p.diferenciaM])).toEqual([["auto-3", 0], ["auto-1", -850]])
  })

  it("prefiere la duración del resumen y deja sin distancia a quien no tiene resumen, al final", () => {
    const viajes = [
      viaje({ viajeId: "a", carId: "auto-1", estado: "DETENIDO", finTs: 9_000 }),
      viaje({ viajeId: "b", carId: "auto-2", estado: "DETENIDO", finTs: 9_000 }),
    ]
    const [c] = agruparPorCarrera(viajes, new Map([["b", resumen(500, 7_777)]]))
    expect(c.estado).toBe("DETENIDA")
    expect(c.participantes[0]).toMatchObject({ carId: "auto-2", duracionMs: 7_777, distanciaM: 500 })
    expect(c.participantes[1]).toMatchObject({ carId: "auto-1", duracionMs: 8_000, distanciaM: null, diferenciaM: null })
  })

  it("ignora los reemplazados, separa los viajes sin carrera y ordena carreras de la más reciente a la más antigua", () => {
    const viajes = [
      viaje({ viajeId: "viejo", carId: "auto-1", estado: "REEMPLAZADO" }),
      viaje({ viajeId: "a", carId: "auto-1", carreraId: C2, inicioViajeTs: 5_000 }),
      viaje({ viajeId: "suelto", carId: "auto-9", carreraId: null, inicioViajeTs: 3_000 }),
      viaje({ viajeId: "b", carId: "auto-2" }),
    ]
    const carreras = agruparPorCarrera(viajes, new Map())
    expect(carreras.map((c) => c.clave)).toEqual([C2, "viaje:suelto", C1])
    expect(carreras[2].participantes.map((p) => p.viajeId)).toEqual(["b"])
  })

  it("una carrera cortada por la paginación (2 de 3 autos) se muestra con los que llegaron en la página", () => {
    const [c] = agruparPorCarrera([viaje({ viajeId: "a", carId: "auto-1" }), viaje({ viajeId: "b", carId: "auto-2" })], new Map())
    expect(c.participantes).toHaveLength(2)
  })

  it("los empates se ordenan por carId numérico", () => {
    const [c] = agruparPorCarrera([viaje({ viajeId: "x", carId: "auto-10" }), viaje({ viajeId: "y", carId: "auto-2" })], new Map())
    expect(c.participantes.map((p) => p.carId)).toEqual(["auto-2", "auto-10"])
  })

  it("una página vacía no tiene carreras", () => expect(agruparPorCarrera([], new Map())).toEqual([]))
})
