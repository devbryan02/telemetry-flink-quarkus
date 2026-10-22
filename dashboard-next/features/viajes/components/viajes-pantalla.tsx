"use client"

import { Button, ContentSwitcher, DatePicker, DatePickerInput, InlineLoading, InlineNotification, Select, SelectItem, Switch } from "@carbon/react"
import { useEffect, useMemo, useState } from "react"

import { Encabezado } from "@/components/encabezado"

import { listarRutas, obtenerGeometria } from "../api"
import type { EstadoCarrera } from "../carreras"
import { useCarreras } from "../hooks/use-carreras"
import { conteoPorEstado, filtrarCarreras, trazoSvg } from "../presentacion"
import type { ResumenRuta } from "../types"
import { TarjetaCarrera } from "./tarjeta-carrera"

const ESTADOS: (EstadoCarrera | null)[] = [null, "EN_CURSO", "TERMINADA", "DETENIDA"]
const NOMBRE: Record<EstadoCarrera, string> = { EN_CURSO: "En curso", TERMINADA: "Terminadas", DETENIDA: "Detenidas" }

/** Viajes del día agrupados por carrera (diseño "Moderno · Viajes"). */
export function ViajesPantalla() {
  const [fecha, setFecha] = useState(() => new Date())
  const [estado, setEstado] = useState<EstadoCarrera | null>(null)
  const [ruta, setRuta] = useState<string | null>(null)
  const [rutas, setRutas] = useState<ResumenRuta[]>([])
  const [trazos, setTrazos] = useState(new Map<string, string>())
  const { carreras, cargando, error, hayMas, cargarMas } = useCarreras(fecha)

  useEffect(() => {
    const control = new AbortController()
    listarRutas(control.signal).then(setRutas).catch(() => undefined)
    return () => control.abort()
  }, [])

  // geometría de cada ruta presente, una sola vez
  const rutasPresentes = useMemo(() => [...new Set(carreras.map((c) => c.rutaId))], [carreras])
  useEffect(() => {
    for (const id of rutasPresentes) {
      if (trazos.has(id)) continue
      obtenerGeometria(id)
        .then((g) => setTrazos((t) => new Map(t).set(id, trazoSvg(g.features[0]?.geometry.coordinates ?? [], 200, 120, 12))))
        .catch(() => setTrazos((t) => new Map(t).set(id, "")))
    }
  }, [rutasPresentes, trazos])

  const conteo = conteoPorEstado(carreras)
  const visibles = filtrarCarreras(carreras, { estado, ruta })
  const nombre = (id: string) => rutas.find((r) => r.id === id)?.nombre ?? id
  const longitud = (id: string) => rutas.find((r) => r.id === id)?.km ?? null

  return (
    <>
      <Encabezado />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-[1312px] flex-col gap-5 px-6 pt-7 pb-10">
          <div className="flex flex-col gap-1">
            <h1 className="text-[28px] leading-9 font-normal">Viajes</h1>
            <p className="text-muted-foreground">
              {carreras.length} carreras · {carreras.reduce((n, c) => n + c.participantes.length, 0)} viajes
            </p>
          </div>

          <div role="toolbar" aria-label="Filtros" className="flex flex-wrap items-end gap-3">
            <ContentSwitcher
              size="sm"
              selectedIndex={ESTADOS.indexOf(estado)}
              onChange={({ index }) => setEstado(ESTADOS[index ?? 0])}
              className="w-full min-w-0 sm:w-auto"
            >
              {ESTADOS.map((e) => (
                <Switch key={e ?? "todas"} name={e ?? "todas"} text={e ? `${NOMBRE[e]} · ${conteo[e]}` : `Todas · ${carreras.length}`} />
              ))}
            </ContentSwitcher>
            <Select id="filtro-ruta" inline size="sm" labelText="Ruta" value={ruta ?? ""} onChange={(e) => setRuta(e.target.value || null)}>
              <SelectItem value="" text="Todas" />
              {rutas.map((r) => (
                <SelectItem key={r.id} value={r.id} text={r.nombre} />
              ))}
            </Select>
            <DatePicker datePickerType="single" dateFormat="d/m/Y" value={fecha} onChange={([d]) => d && setFecha(d)}>
              <DatePickerInput id="filtro-fecha" labelText="Fecha" placeholder="dd/mm/aaaa" size="sm" />
            </DatePicker>
          </div>

          {error && <InlineNotification kind="error" lowContrast hideCloseButton title="No se pudieron cargar los viajes" subtitle={error} />}
          {cargando && carreras.length === 0 && <InlineLoading description="Cargando viajes…" />}
          {!cargando && !error && visibles.length === 0 && (
            <p className="rounded-lg border p-6 text-muted-foreground">No hay carreras con estos filtros en la fecha elegida.</p>
          )}

          <ul className="flex flex-col gap-3">
            {visibles.map((c) => (
              <TarjetaCarrera key={c.clave} carrera={c} nombreRuta={nombre(c.rutaId)} longitudKm={longitud(c.rutaId)} trazo={trazos.get(c.rutaId) ?? ""} />
            ))}
          </ul>

          {hayMas && (
            <Button kind="tertiary" size="md" disabled={cargando} onClick={() => void cargarMas()} className="self-center">
              {cargando ? "Cargando…" : "Cargar más carreras"}
            </Button>
          )}
        </div>
      </div>
    </>
  )
}
