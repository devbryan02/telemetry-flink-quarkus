import { varColor } from "../paleta"

/** Leyenda del mapa: color de cada auto con su empresa y los dos tramos de la ruta. */
export function Leyenda({ autos }: { autos: { carId: string; empresa: string }[] }) {
  return (
    <section
      aria-label="Leyenda del mapa"
      className="absolute bottom-10 left-4 z-10 hidden min-w-[200px] bg-card text-card-foreground shadow-md sm:block"
    >
      <h2 className="border-b px-3 py-2 text-xs font-semibold">Leyenda</h2>
      <ul className="flex flex-col gap-1.5 px-3 py-2 text-xs">
        {autos.map((a) => (
          <li key={a.carId} className="flex items-center gap-2">
            <span aria-hidden className="size-3 rounded-full" style={{ background: varColor(a.carId) }} />
            {a.carId} · {a.empresa}
          </li>
        ))}
        <li className="mt-0.5 flex items-center gap-2 border-t pt-2">
          <span aria-hidden className="h-1 w-5 bg-[var(--ruta-recorrido)]" />
          Tramo recorrido por el líder
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden className="h-1 w-5 bg-[var(--ruta-pendiente)]" />
          Tramo pendiente
        </li>
      </ul>
    </section>
  )
}
