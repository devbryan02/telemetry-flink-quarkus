import { describe, expect, it } from "vitest"

import { estadoEn, huecos, prepararRecorrido, velocidades } from "./repeticion"
import type { PosicionVista } from "./types"

// 0,001° de latitud ≈ 111,32 m
function pos(ts: number, lat: number, extra: Partial<PosicionVista> = {}): PosicionVista {
  return {
    eventId: `e${ts}-${lat}`, viajeId: "v", tipoEvento: "POSICION", receivedAt: "", carId: "auto-1",
    companyId: null, fleetId: null, lat, lon: -77, heading: 0, engine: "ON", battery: 90, ts, ...extra,
  }
}

describe("prepararRecorrido", () => {
  it("ordena por ts, descarta repeticiones del mismo ts y acumula metros", () => {
    const r = prepararRecorrido([pos(2_000, -12.002), pos(0, -12.0), pos(1_000, -12.001), pos(1_000, -12.5)])
    expect(r.muestras.map((m) => m.ts)).toEqual([0, 1_000, 2_000])
    expect(r.acumuladoM[0]).toBe(0)
    expect(r.acumuladoM[2]).toBeCloseTo(222.64, 1)
  })
})

describe("velocidades", () => {
  it("111,32 m en 1 s son ~400,8 km/h", () => {
    const v = velocidades(prepararRecorrido([pos(0, -12.0), pos(1_000, -12.001)]))
    expect(v).toHaveLength(1)
    expect(v[0].ts).toBe(1_000)
    expect(v[0].kmh).toBeCloseTo(400.75, 1)
  })
  it("nunca da Infinity ni NaN, aunque haya un solo punto", () => {
    expect(velocidades(prepararRecorrido([pos(0, -12)]))).toEqual([])
    expect(velocidades(prepararRecorrido([]))).toEqual([])
  })
})

describe("huecos", () => {
  it("marca los tramos más largos que el umbral", () => {
    const r = prepararRecorrido([pos(0, -12), pos(1_000, -12.001), pos(4_000, -12.002)])
    expect(huecos(r, 1_500)).toEqual([{ desde: 1_000, hasta: 4_000, ms: 3_000 }])
  })
})

describe("estadoEn", () => {
  const r = prepararRecorrido([pos(0, -12.0, { battery: 90 }), pos(1_000, -12.001, { battery: 80 })])
  it("interpola a mitad de tramo", () => {
    const e = estadoEn(r, 500)!
    expect(e.lat).toBeCloseTo(-12.0005, 6)
    expect(e.battery).toBeCloseTo(85, 6)
    expect(e.distanciaM).toBeCloseTo(55.66, 1)
    expect(e.kmh).toBeCloseTo(400.75, 1)
    expect(e.indice).toBe(0)
  })
  it("se queda en los extremos fuera del rango", () => {
    expect(estadoEn(r, -10)!.lat).toBe(-12.0)
    expect(estadoEn(r, 9_999)!).toMatchObject({ lat: -12.001, indice: 1 })
  })
  it("una sola muestra se devuelve tal cual y sin muestras no hay estado", () => {
    expect(estadoEn(prepararRecorrido([pos(5, -12)]), 0)).toMatchObject({ lat: -12, kmh: 0, distanciaM: 0 })
    expect(estadoEn(prepararRecorrido([]), 0)).toBeNull()
  })
})
