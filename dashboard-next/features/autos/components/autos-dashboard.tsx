"use client"

import dynamic from "next/dynamic"

// MapLibre necesita `window`: el mapa se carga solo en el cliente.
// `ssr: false` solo está permitido dentro de un Client Component.
const AutosMap = dynamic(() => import("./autos-map"), { ssr: false })

export function AutosDashboard() {
  return <AutosMap />
}
