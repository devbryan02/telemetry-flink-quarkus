"use client"

import type { StyleSpecification } from "maplibre-gl"
import { useEffect, useState } from "react"

import { PALETA_CLARA, PALETA_OSCURA, recolorear } from "../estilo-mapa"

/** Positron de OpenFreeMap: tiles vectoriales OpenMapTiles, gratis y sin API key. */
const ESTILO_BASE = "https://tiles.openfreemap.org/styles/positron"

type Estilos = { light: StyleSpecification; dark: StyleSpecification }
let cache: Promise<Estilos> | null = null

/** Estilos claro/oscuro con los grises de Carbon; `undefined` mientras carga o si falla (mapcn usa Carto). */
export function useEstilosMapa(): Estilos | undefined {
  const [estilos, setEstilos] = useState<Estilos>()
  useEffect(() => {
    cache ??= fetch(ESTILO_BASE)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<StyleSpecification>
      })
      .then((base) => ({ light: recolorear(base, PALETA_CLARA), dark: recolorear(base, PALETA_OSCURA) }))
    let vigente = true
    cache.then(
      (e) => vigente && setEstilos(e),
      () => {
        cache = null // se reintenta en el próximo montaje
      },
    )
    return () => {
      vigente = false
    }
  }, [])
  return estilos
}
