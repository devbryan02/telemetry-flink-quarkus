import { describe, expect, it } from "vitest"

import type { Carrera, Participante } from "./carreras"
import { conteoPorEstado, duracion, filtrarCarreras, rangoDelDia, textoResultado, trazoSvg } from "./presentacion"

const p = (x: Partial<Participante>): Participante => ({
  viajeId: "v", carId: "auto-1", companyId: null, fleetId: null, estado: "SIN_CIERRE", posicion: 1,
  duracionMs: null, distanciaM: null, velocidadMediaKmh: null, diferenciaMs: null, diferenciaM: null, ...x,
})
const c = (x: Partial<Carrera>): Carrera => ({
  clave: "k", carreraId: null, rutaId: "av-brasil", inicioTs: 0, estado: "EN_CURSO", participantes: [], ...x,
})

describe("rangoDelDia", () => {
  it("va de la medianoche local al último milisegundo del día", () => {
    expect(rangoDelDia(new Date(2026, 9, 21, 15, 30))).toEqual({
      desde: new Date(2026, 9, 21).getTime(),
      hasta: new Date(2026, 9, 22).getTime() - 1,
    })
  })
})

describe("filtrarCarreras y conteoPorEstado", () => {
  const cs = [c({ clave: "a", estado: "EN_CURSO" }), c({ clave: "b", estado: "TERMINADA", rutaId: "panamericana-sur" })]
  it("sin filtro devuelve todas", () => expect(filtrarCarreras(cs, { estado: null, ruta: null })).toHaveLength(2))
  it("filtra por estado y por ruta a la vez", () => {
    expect(filtrarCarreras(cs, { estado: "TERMINADA", ruta: null }).map((x) => x.clave)).toEqual(["b"])
    expect(filtrarCarreras(cs, { estado: "TERMINADA", ruta: "av-brasil" })).toEqual([])
  })
  it("cuenta por estado, con 0 en los que faltan", () =>
    expect(conteoPorEstado(cs)).toEqual({ EN_CURSO: 1, TERMINADA: 1, DETENIDA: 0 }))
})

describe("duracion y textoResultado", () => {
  it("minutos y segundos, con horas si pasa de 60 min", () => {
    expect(duracion(234_000)).toBe("3:54")
    expect(duracion(4 * 3_600_000 + 5 * 60_000 + 7_000)).toBe("4:05:07")
  })
  it("finalizado: tiempo y diferencia con el ganador", () => {
    expect(textoResultado(p({ estado: "FINALIZADO", duracionMs: 312_000, diferenciaMs: 78_000 }))).toEqual({ valor: "5:12", diferencia: "+1:18" })
    expect(textoResultado(p({ estado: "FINALIZADO", duracionMs: 234_000, diferenciaMs: 0 })).diferencia).toBe("—")
  })
  it("sin llegar: distancia y metros detrás del que va adelante", () => {
    expect(textoResultado(p({ distanciaM: 2_570, diferenciaM: -850 }))).toEqual({ valor: "2.57 km", diferencia: "−0.85 km" })
    expect(textoResultado(p({ distanciaM: 3_420, diferenciaM: 0 })).diferencia).toBe("adelante")
    expect(textoResultado(p({}))).toEqual({ valor: "—", diferencia: "—" })
  })
})

describe("trazoSvg", () => {
  it("encaja la línea en la caja con margen y el norte hacia arriba", () => {
    expect(trazoSvg([[0, 0], [10, 10]], 100, 100, 10)).toBe("M10 90 L90 10")
  })
  it("con menos de 2 puntos no dibuja nada", () => expect(trazoSvg([[1, 1]], 100, 100, 10)).toBe(""))
  it("un tramo sin extensión no produce NaN", () => expect(trazoSvg([[5, 5], [5, 5]], 100, 100, 10)).not.toContain("NaN"))
})
