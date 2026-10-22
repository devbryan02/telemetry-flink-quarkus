"use client"

import { Header, HeaderGlobalBar, HeaderMenuItem, HeaderName, HeaderNavigation, Tag, Theme } from "@carbon/react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { SelectorTema } from "@/components/selector-tema"
import { SECCIONES, seccionActiva } from "@/lib/secciones"

export type Conexion = "conectando" | "abierta" | "reconectando"

const ESTADO: Record<Conexion, { texto: string; tipo: "green" | "gray" | "red" }> = {
  conectando: { texto: "Conectando", tipo: "gray" },
  abierta: { texto: "En vivo", tipo: "green" },
  reconectando: { texto: "Reconectando", tipo: "red" },
}

/** UI Shell de Carbon: G100 en ambos temas, secciones como rutas de Next, estado del WebSocket y tema. */
export function Encabezado({ conexion }: { conexion?: Conexion }) {
  const activa = seccionActiva(usePathname())
  return (
    <Theme theme="g100">
      {/* El Header de Carbon es fixed; aquí va en el flujo para que el layout flex no lo tape */}
      <Header aria-label="Telemetría" className="static!">
        <HeaderName as={Link} href="/" prefix="Telemetría">
          [Carrera]
        </HeaderName>
        <HeaderNavigation aria-label="Secciones">
          {SECCIONES.filter((s) => s.disponible).map((s) => (
            <HeaderMenuItem key={s.href} as={Link} href={s.href} isActive={activa === s.href}>
              {s.nombre}
            </HeaderMenuItem>
          ))}
        </HeaderNavigation>
        <HeaderGlobalBar>
          {conexion && (
            <Tag type={ESTADO[conexion].tipo} size="sm" role="status" className="self-center">
              {ESTADO[conexion].texto}
            </Tag>
          )}
          <SelectorTema />
        </HeaderGlobalBar>
      </Header>
    </Theme>
  )
}
