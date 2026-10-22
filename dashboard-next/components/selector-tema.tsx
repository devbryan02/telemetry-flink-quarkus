"use client"

import { HeaderGlobalAction } from "@carbon/react"
import { Laptop, Moon, Sun } from "@carbon/icons-react"
import { useTheme } from "next-themes"
import { useSyncExternalStore } from "react"

import { siguienteTema } from "@/lib/tema"

const ETIQUETA = { light: "Tema claro", dark: "Tema oscuro", system: "Tema del sistema" } as const

/** `true` solo en el cliente: el tema guardado no se conoce durante el prerenderizado. */
function useMontado(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )
}

/** Un botón que rota claro → oscuro → sistema; la elección la guarda next-themes. */
export function SelectorTema() {
  const { theme, setTheme } = useTheme()
  const montado = useMontado()
  const actual = montado && (theme === "light" || theme === "dark") ? theme : "system"
  const Icono = actual === "light" ? Sun : actual === "dark" ? Moon : Laptop
  return (
    <HeaderGlobalAction
      aria-label={`${ETIQUETA[actual]}. Cambiar a ${ETIQUETA[siguienteTema(actual)].toLowerCase()}`}
      tooltipAlignment="end"
      onClick={() => setTheme(siguienteTema(actual))}
    >
      <Icono size={20} />
    </HeaderGlobalAction>
  )
}
