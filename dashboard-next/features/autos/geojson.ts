import type { Feature, FeatureCollection, Point } from "geojson"

import type { Auto } from "./types"

export type PropiedadesAuto = Pick<Auto, "carId" | "companyId" | "fleetId" | "heading" | "engine" | "battery" | "ts">

export type AutosGeoJSON = FeatureCollection<Point, PropiedadesAuto>

/** Convierte la flota en una sola FeatureCollection para la fuente del mapa. */
export function aGeoJSON(autos: Iterable<Auto>): AutosGeoJSON {
  const features: Feature<Point, PropiedadesAuto>[] = []
  for (const a of autos) {
    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [a.lon, a.lat] },
      properties: {
        carId: a.carId,
        companyId: a.companyId,
        fleetId: a.fleetId,
        heading: a.heading,
        engine: a.engine,
        battery: a.battery,
        ts: a.ts,
      },
    })
  }
  return { type: "FeatureCollection", features }
}
