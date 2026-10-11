"use client"

import { Monitor, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useSyncExternalStore } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const OPCIONES = [
  { valor: "light", etiqueta: "Tema claro", Icono: Sun },
  { valor: "dark", etiqueta: "Tema oscuro", Icono: Moon },
  { valor: "system", etiqueta: "Tema del sistema", Icono: Monitor },
] as const

/** `true` solo en el cliente: el tema guardado no se conoce durante el prerenderizado. */
function useMontado(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )
}

/** Claro / Oscuro / Sistema. La elección se guarda en el navegador (next-themes). */
export function SelectorTema({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  const montado = useMontado()

  return (
    <div role="group" aria-label="Tema" className={cn("flex items-center gap-0.5 rounded-lg border p-0.5", className)}>
      {OPCIONES.map(({ valor, etiqueta, Icono }) => {
        const activo = montado && theme === valor
        return (
          <Button
            key={valor}
            size="icon-xs"
            variant={activo ? "secondary" : "ghost"}
            aria-label={etiqueta}
            aria-pressed={activo}
            title={etiqueta}
            onClick={() => setTheme(valor)}
          >
            <Icono />
          </Button>
        )
      })}
    </div>
  )
}
