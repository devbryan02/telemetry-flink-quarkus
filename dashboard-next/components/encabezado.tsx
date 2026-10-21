import { SelectorTema } from "@/components/selector-tema"
import { cn } from "@/lib/utils"

type Conexion = "conectando" | "abierta" | "reconectando"

const ETIQUETA: Record<Conexion, string> = { conectando: "Conectando", abierta: "En vivo", reconectando: "Reconectando" }
const PESTANAS = [
  { nombre: "Carrera", activa: true },
  { nombre: "Viajes", activa: false },
  { nombre: "Operación", activa: false },
] as const

/**
 * Cabecera tipo UI Shell de Carbon: nombre, secciones, estado del WebSocket y tema.
 * Es G100 en ambos temas: la clase `dark` hace que sus controles usen los tokens oscuros.
 */
export function Encabezado({ conexion }: { conexion: Conexion }) {
  const enVivo = conexion === "abierta"
  return (
    <header className="dark flex h-12 shrink-0 items-center border-b border-header-border bg-header text-header-foreground">
      <span className="px-4 text-sm whitespace-nowrap">
        Telemetría <span className="hidden font-semibold sm:inline">[Carrera]</span>
      </span>
      <nav aria-label="Secciones" className="flex h-12 border-l border-header-border">
        {PESTANAS.map((p) =>
          p.activa ? (
            <span
              key={p.nombre}
              aria-current="page"
              className="flex items-center bg-white/10 px-4 text-sm shadow-[inset_0_-3px_0_var(--primary)]"
            >
              {p.nombre}
            </span>
          ) : (
            <button
              key={p.nombre}
              type="button"
              disabled
              title="Próximamente"
              className="hidden px-4 text-sm text-header-foreground/50 sm:block"
            >
              {p.nombre}
            </button>
          ),
        )}
      </nav>
      <div className="ml-auto flex items-center gap-2 pr-2">
        {/* Colores de las etiquetas de estado de Carbon G100 (verde 80/20 y rojo 80/20): fijos como la cabecera */}
        <span
          role="status"
          className={cn(
            "inline-flex h-6 items-center gap-1.5 rounded-full px-2 text-xs whitespace-nowrap",
            enVivo ? "bg-[#044317] text-[#a7f0ba]" : "bg-[#750e13] text-[#ffd7d9]",
          )}
        >
          <span className={cn("size-2 rounded-full", enVivo ? "bg-[#42be65]" : "bg-[#fa4d56]")} />
          <span className="sr-only sm:not-sr-only">{ETIQUETA[conexion]}</span>
        </span>
        <SelectorTema />
      </div>
    </header>
  )
}
