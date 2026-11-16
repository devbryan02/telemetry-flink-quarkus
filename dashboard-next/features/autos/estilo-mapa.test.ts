import type { StyleSpecification } from "maplibre-gl"
import { describe, expect, it } from "vitest"

import { PALETA_CLARA, recolorear } from "./estilo-mapa"

const base = (): StyleSpecification => ({
  version: 8,
  sources: {},
  layers: [
    { id: "background", type: "background", paint: { "background-color": "#fff" } },
    { id: "water", type: "fill", source: "openmaptiles", "source-layer": "water", paint: { "fill-color": "#abc" } },
    { id: "park", type: "fill", source: "openmaptiles", "source-layer": "park", paint: { "fill-color": "#0f0" } },
    { id: "building", type: "fill", source: "openmaptiles", "source-layer": "building", paint: { "fill-color": "#ddd" } },
    { id: "highway_major_casing", type: "line", source: "openmaptiles", "source-layer": "transportation", paint: { "line-color": "#ccc" } },
    { id: "highway_major", type: "line", source: "openmaptiles", "source-layer": "transportation", paint: { "line-color": "#eee" } },
    { id: "place_label", type: "symbol", source: "openmaptiles", "source-layer": "place", paint: { "text-color": "#000" } },
    { id: "poi_label", type: "symbol", source: "openmaptiles", "source-layer": "poi", layout: {} },
    { id: "otra", type: "hillshade", source: "dem" },
  ],
})

type Capa = { paint: Record<string, unknown>; layout: Record<string, unknown> }
const capa = (e: StyleSpecification, id: string) => e.layers.find((l) => l.id === id) as unknown as Capa

describe("recolorear", () => {
  const e = recolorear(base(), PALETA_CLARA)
  it("pinta el suelo, el agua, los parques y las manzanas", () => {
    expect(capa(e, "background").paint["background-color"]).toBe(PALETA_CLARA.suelo)
    expect(capa(e, "water").paint["fill-color"]).toBe(PALETA_CLARA.agua)
    expect(capa(e, "park").paint["fill-color"]).toBe(PALETA_CLARA.parque)
    expect(capa(e, "building").paint["fill-color"]).toBe(PALETA_CLARA.manzana)
  })
  it("distingue el borde de las vías de su relleno", () => {
    expect(capa(e, "highway_major_casing").paint["line-color"]).toBe(PALETA_CLARA.borde)
    expect(capa(e, "highway_major").paint["line-color"]).toBe(PALETA_CLARA.via)
  })
  it("etiquetas en gris con halo del suelo y sin puntos de interés", () => {
    expect(capa(e, "place_label").paint["text-color"]).toBe(PALETA_CLARA.etiqueta)
    expect(capa(e, "place_label").paint["text-halo-color"]).toBe(PALETA_CLARA.suelo)
    expect(capa(e, "poi_label").layout.visibility).toBe("none")
  })
  it("deja intactas las capas que no conoce y no muta la entrada", () => {
    const original = base()
    const copia = JSON.stringify(original)
    recolorear(original, PALETA_CLARA)
    expect(JSON.stringify(original)).toBe(copia)
    expect(capa(e, "otra")).toEqual({ id: "otra", type: "hillshade", source: "dem" })
  })
})
