import { http } from "@/lib/http"

import { parsearPrometheus, type MuestraProm } from "./prometheus"
import { interpretarSalud, type Salud } from "./salud"

/** 503 es una respuesta válida de readiness (DOWN): axios no debe convertirla en excepción. */
export async function obtenerSalud(): Promise<Salud> {
  const r = await http.get<unknown>("/q/health/ready", { validateStatus: (s) => s === 200 || s === 503 })
  return interpretarSalud(r.status, r.data)
}

export async function obtenerMetricas(): Promise<MuestraProm[]> {
  const { data } = await http.get<string>("/q/metrics", { responseType: "text", headers: { Accept: "text/plain" } })
  return parsearPrometheus(data)
}
