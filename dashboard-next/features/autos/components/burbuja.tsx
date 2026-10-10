"use client"

import { useEffect, useMemo, useState } from "react"

import { MapMarker, MarkerContent, MarkerPopup, useMap } from "@/components/ui/map"
import { cn } from "@/lib/utils"

import { type BurbujaGrupos, fusionarSolapadas, type Grupo } from "../agrupar"

const numero = new Intl.NumberFormat("es-PE")
/** Dos burbujas más cerca que esto (en píxeles) se fusionan en una. */
const DISTANCIA_MINIMA_PX = 70

type Variante = "empresa" | "flota"

/**
 * Burbuja de una empresa o flota con su total y % de motor encendido. Si representa varias que se
 * solapan, el clic abre una lista para elegir una (acercar el zoom no siempre las separa: dos
 * empresas pueden tener su base en el mismo distrito).
 */
function Burbuja({
  burbuja,
  variante,
  onSeleccionar,
}: {
  burbuja: BurbujaGrupos
  variante: Variante
  onSeleccionar: (grupo: Grupo) => void
}) {
  const varias = burbuja.grupos.length > 1
  const nombre = varias
    ? `${burbuja.grupos.length} ${variante === "empresa" ? "empresas" : "flotas"}`
    : burbuja.grupos[0].nombre
  const encendidos = burbuja.total ? Math.round((burbuja.encendidos / burbuja.total) * 100) : 0
  const tamanio = burbuja.total >= 1000 ? "grande" : burbuja.total >= 100 ? "mediana" : "chica"
  const detalle = varias ? `: ${burbuja.grupos.map((g) => g.nombre).join(", ")}` : ""

  return (
    <MapMarker
      longitude={burbuja.centro[0]}
      latitude={burbuja.centro[1]}
      onClick={(e) => {
        // En una fusionada el clic debe llegar al mapa: así MapLibre abre/cierra el popup con la lista
        if (varias) return
        e.stopPropagation()
        onSeleccionar(burbuja.grupos[0])
      }}
    >
      <MarkerContent>
        <div
          title={`${nombre}${detalle} — ${numero.format(burbuja.total)} autos, ${encendidos} % con motor encendido`}
          className={cn(
            "flex flex-col items-center rounded-2xl border-2 border-white shadow-lg transition-transform hover:scale-105",
            variante === "empresa" ? "bg-primary text-primary-foreground" : "bg-sky-600 text-white",
            varias && "border-dashed",
            tamanio === "grande" && "px-3 py-1.5 text-sm",
            tamanio === "mediana" && "px-2.5 py-1 text-xs",
            tamanio === "chica" && "px-2 py-0.5 text-[11px]",
          )}
        >
          <span className="leading-tight font-medium whitespace-nowrap">{nombre}</span>
          <span className="leading-tight font-semibold tabular-nums">{numero.format(burbuja.total)}</span>
          <span className="mt-0.5 h-1 w-full overflow-hidden rounded-full bg-white/30">
            <span className="block h-full bg-green-400" style={{ width: `${encendidos}%` }} />
          </span>
        </div>
      </MarkerContent>
      {varias && (
        <MarkerPopup className="p-1" offset={14}>
          <ul className="flex max-h-64 min-w-44 flex-col overflow-y-auto text-xs">
            {[...burbuja.grupos]
              .sort((a, b) => a.id.localeCompare(b.id, "es", { numeric: true }))
              .map((g) => (
                <li key={g.id}>
                  <button
                    type="button"
                    className="flex w-full justify-between gap-3 rounded px-2 py-1 text-left hover:bg-muted"
                    onClick={() => onSeleccionar(g)}
                  >
                    <span>{g.nombre}</span>
                    <span className="tabular-nums text-muted-foreground">{numero.format(g.total)}</span>
                  </button>
                </li>
              ))}
          </ul>
        </MarkerPopup>
      )}
    </MapMarker>
  )
}

/**
 * Burbujas de empresas o flotas. Las que se solaparían en pantalla se fusionan en una sola
 * ("3 flotas · 245"); la fusión se recalcula al terminar cada movimiento del mapa.
 * Clic en una burbuja simple, o en un elemento de la lista de una fusionada: `onSeleccionar(grupo)`.
 */
export function Burbujas({
  grupos,
  variante,
  onSeleccionar,
}: {
  grupos: Grupo[]
  variante: Variante
  onSeleccionar: (grupo: Grupo) => void
}) {
  const { map } = useMap()
  const [vista, setVista] = useState(0)

  useEffect(() => {
    if (!map) return
    const alTerminar = () => setVista((v) => v + 1)
    map.on("moveend", alTerminar)
    return () => {
      map.off("moveend", alTerminar)
    }
  }, [map])

  const burbujas = useMemo(() => {
    if (!map) return []
    void vista // recalcular cuando el mapa termina de moverse
    return fusionarSolapadas(
      grupos,
      (lonLat) => {
        const p = map.project(lonLat)
        return [p.x, p.y]
      },
      DISTANCIA_MINIMA_PX,
    )
  }, [map, grupos, vista])

  return burbujas.map((b) => (
    <Burbuja
      key={b.grupos.map((g) => g.id).join("+")}
      burbuja={b}
      variante={variante}
      onSeleccionar={onSeleccionar}
    />
  ))
}
