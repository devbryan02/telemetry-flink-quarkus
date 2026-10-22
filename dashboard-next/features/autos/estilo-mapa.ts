import type { LayerSpecification, StyleSpecification } from "maplibre-gl"

/** Colores del mapa base. MapLibre necesita valores concretos: son los grises de Carbon de cada tema. */
export type PaletaMapa = {
  suelo: string
  manzana: string
  parque: string
  agua: string
  via: string
  borde: string
  etiqueta: string
}

/** White: Gray 10 de suelo, vías blancas, agua Cool Gray 20 y etiquetas Gray 70. */
export const PALETA_CLARA: PaletaMapa = {
  suelo: "#f4f4f4",
  manzana: "#e8e8e8",
  parque: "#e5e8e3",
  agua: "#dde1e6",
  via: "#ffffff",
  borde: "#e0e0e0",
  etiqueta: "#525252",
}

/** G100: Gray 100 de suelo, vías Gray 80, agua Cool Gray 90 y etiquetas Gray 40. */
export const PALETA_OSCURA: PaletaMapa = {
  suelo: "#161616",
  manzana: "#1e1e1e",
  parque: "#1b201c",
  agua: "#21272a",
  via: "#393939",
  borde: "#262626",
  etiqueta: "#a8a8a8",
}

const PARQUES = new Set(["park", "landcover"])

function color(capa: LayerSpecification, p: PaletaMapa): LayerSpecification {
  const fuente = "source-layer" in capa ? capa["source-layer"] : undefined
  switch (capa.type) {
    case "background":
      return { ...capa, paint: { ...capa.paint, "background-color": p.suelo } }
    case "fill": {
      const c = fuente === "water" ? p.agua : PARQUES.has(fuente ?? "") ? p.parque : p.manzana
      return { ...capa, paint: { ...capa.paint, "fill-color": c, "fill-outline-color": c } }
    }
    case "line": {
      const c =
        fuente === "waterway" ? p.agua : fuente === "transportation" && !capa.id.includes("casing") ? p.via : p.borde
      return { ...capa, paint: { ...capa.paint, "line-color": c } }
    }
    case "symbol":
      // los puntos de interés compiten con los autos: se ocultan
      if (fuente === "poi") return { ...capa, layout: { ...capa.layout, visibility: "none" } }
      return { ...capa, paint: { ...capa.paint, "text-color": p.etiqueta, "text-halo-color": p.suelo } }
    default:
      return capa
  }
}

/** Copia del estilo con cada capa conocida pintada con la paleta; las demás quedan igual. */
export function recolorear(estilo: StyleSpecification, paleta: PaletaMapa): StyleSpecification {
  return { ...estilo, layers: estilo.layers.map((capa) => color(capa, paleta)) }
}
