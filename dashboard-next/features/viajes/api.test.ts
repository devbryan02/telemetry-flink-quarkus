import { afterEach, describe, expect, it } from "vitest"
import type { AxiosAdapter } from "axios"

import { http } from "@/lib/http"
import { listarPosiciones } from "./api"

const adaptadorOriginal = http.defaults.adapter
afterEach(() => { http.defaults.adapter = adaptadorOriginal })

describe("listarPosiciones", () => {
  it("rechaza un recorrido que aún tiene páginas al alcanzar el límite", async () => {
    // El adaptador sustituye solo la red; el cliente recorre páginas reales de su contrato.
    const adaptador: AxiosAdapter = async config => ({
      data: { items: [], nextCursor: "otra-página" }, status: 200, statusText: "OK", headers: {}, config,
    })
    http.defaults.adapter = adaptador
    await expect(listarPosiciones("viaje-largo")).rejects.toThrow(/límite|completo/)
  })
})
