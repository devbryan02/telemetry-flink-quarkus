import { describe, expect, it } from "vitest"

import { type Coordenada, dividirRuta, fraccionLider, limitesDe } from "./ruta-progreso"
import type { EstadoSimulacion } from "./types"

// Tres puntos sobre el mismo meridiano: 0→1 y 1→2 miden lo mismo
const RECTA: Coordenada[] = [
  [-77, -12],
  [-77, -12.01],
  [-77, -12.02],
]

describe("dividirRuta", () => {
  it("en 0 todo está pendiente", () => {
    const { recorrido, pendiente } = dividirRuta(RECTA, 0)
    expect(recorrido).toEqual([RECTA[0], RECTA[0]])
    expect(pendiente).toEqual(RECTA)
  })
  it("en 1 todo está recorrido", () => {
    const { recorrido, pendiente } = dividirRuta(RECTA, 1)
    expect(recorrido).toEqual(RECTA)
    expect(pendiente).toEqual([RECTA[2], RECTA[2]])
  })
  it("a la mitad corta en el punto medio y ambos tramos lo comparten", () => {
    const { recorrido, pendiente } = dividirRuta(RECTA, 0.5)
    expect(recorrido.at(-1)![1]).toBeCloseTo(-12.01, 6)
    expect(pendiente[0]).toEqual(recorrido.at(-1))
  })
  it("interpola dentro de un segmento", () => {
    const { recorrido } = dividirRuta(RECTA, 0.25)
    expect(recorrido).toHaveLength(2)
    expect(recorrido[1][1]).toBeCloseTo(-12.005, 6)
  })
  it("acota fracciones fuera de rango", () => {
    expect(dividirRuta(RECTA, 1.7)).toEqual(dividirRuta(RECTA, 1))
    expect(dividirRuta(RECTA, -0.2)).toEqual(dividirRuta(RECTA, 0))
  })
  it("rutas largas (325 km, 5000 puntos) terminan en el último punto", () => {
    const larga: Coordenada[] = Array.from({ length: 5000 }, (_, i) => [-76, -13 - i * 0.0006])
    expect(dividirRuta(larga, 1).recorrido.at(-1)).toEqual(larga.at(-1))
  })
})

const sim = (ruta: string, recorridos: number[]): EstadoSimulacion => ({
  estado: "EN_CURSO",
  ruta,
  inicio: null,
  longitudM: 1000,
  autos: recorridos.map((r, i) => ({
    posicion: i + 1,
    carId: `auto-${i + 1}`,
    companyId: null,
    fleetId: null,
    velocidadKmh: 60,
    recorridoM: r,
    llegadaMs: null,
  })),
})

describe("fraccionLider", () => {
  it("usa el máximo recorrido entre los autos", () =>
    expect(fraccionLider(sim("av-brasil", [300, 400]), "av-brasil")).toBe(0.4))
  it("0 si la ruta elegida no es la de la carrera", () =>
    expect(fraccionLider(sim("av-brasil", [400]), "panamericana-sur")).toBe(0))
  it("0 sin simulación o con longitud 0", () => {
    expect(fraccionLider(null, "av-brasil")).toBe(0)
    expect(fraccionLider({ ...sim("av-brasil", [10]), longitudM: 0 }, "av-brasil")).toBe(0)
  })
})

describe("limitesDe", () => {
  it("encierra todos los puntos de la ruta", () => {
    const ruta = {
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          properties: {},
          geometry: { type: "LineString" as const, coordinates: [[-77.05, -12.06], [-77.02, -12.09], [-77.04, -12.05]] },
        },
      ],
    }
    expect(limitesDe(ruta)).toEqual([
      [-77.05, -12.09],
      [-77.02, -12.05],
    ])
  })
})
