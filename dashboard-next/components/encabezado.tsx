"use client"

import { Header, HeaderGlobalBar, HeaderMenuButton, HeaderMenuItem, HeaderName, HeaderNavigation, SideNav, SideNavItems, SideNavLink, Tag, Theme } from "@carbon/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"

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
  const [menu, setMenu] = useState(false)
  return (
    <Theme theme="g100">
      {/* El Header de Carbon es fixed; aquí va en el flujo para que el layout flex no lo tape */}
      <Header aria-label="Telemetría" className="static!">
        <HeaderMenuButton
          aria-label={menu ? "Cerrar menú de secciones" : "Abrir menú de secciones"}
          aria-expanded={menu}
          aria-controls="secciones-moviles"
          className="min-[1056px]:hidden!"
          isCollapsible
          isActive={menu}
          onClick={() => setMenu(!menu)}
        />
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
      {menu && <SideNav id="secciones-moviles" aria-label="Secciones móviles" expanded={menu} isPersistent={false}
        onToggle={() => setMenu(false)} onOverlayClick={() => setMenu(false)}>
        <SideNavItems>
          {SECCIONES.filter(s => s.disponible).map(s => (
            <SideNavLink key={s.href} as={Link} href={s.href} isActive={activa === s.href} aria-current={activa === s.href ? "page" : undefined} onClick={() => setMenu(false)}>
              {s.nombre}
            </SideNavLink>
          ))}
        </SideNavItems>
      </SideNav>}
    </Theme>
  )
}
