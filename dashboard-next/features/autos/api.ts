import { http } from "@/lib/http"

import type { Auto } from "./types"

/** Estado completo de la flota (`GET /autos`). */
export async function obtenerAutos(signal?: AbortSignal): Promise<Auto[]> {
  const { data } = await http.get<Auto[]>("/autos", { signal })
  return data
}
