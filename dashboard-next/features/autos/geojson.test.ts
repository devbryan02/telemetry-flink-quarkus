import { describe, expect, it } from "vitest"

import { aGeoJSON } from "./geojson"
import type { Auto } from "./types"

const auto = (carId: string, engine: "ON" | "OFF" = "ON"): Auto => ({
  carId,
  companyId: "emp-01",
  fleetId: "emp-01-f1",
  lat: -12,
  lon: -77,
  heading: 220,
  engine,
  battery: 100,
  ts: 1,
})

describe("aGeoJSON", () => {
  it("agrega color y número del auto", () => {
    const p = aGeoJSON([auto("auto-2")]).features[0].properties
    expect(p.color).toBe(2)
    expect(p.numero).toBe("2")
  })
  it("ids sin número usan las dos primeras letras como etiqueta", () =>
    expect(aGeoJSON([auto("car-xyz")]).features[0].properties.numero).toBe("CA"))
})
