import { describe, expect, it } from "vitest"

import { filasSalud, interpretarSalud } from "./salud"

const caido = {
  status: "DOWN",
  checks: [
    { name: "Database connections health check", status: "UP", data: { "<default>": "UP" } },
    { name: "SmallRye Reactive Messaging - readiness check", status: "DOWN", data: { "ultima-posicion": "[OK]", "historial-telemetria": "[KO] - fallo de BD" } },
  ],
}

describe("interpretarSalud", () => {
  it("un 503 con cuerpo de SmallRye Health es DOWN con su detalle, no un error de red", () => {
    const s = interpretarSalud(503, caido)
    expect(s.status).toBe("DOWN")
    expect(s.error).toBeNull()
    expect(s.checks).toHaveLength(2)
  })
  it("un cuerpo que no es de salud se informa como error", () => {
    expect(interpretarSalud(502, "<html>Bad gateway</html>")).toEqual({ status: "DOWN", checks: [], error: "Respuesta inesperada (HTTP 502)" })
  })
})

describe("filasSalud", () => {
  it("abre cada canal de mensajería en su propia fila", () => {
    expect(filasSalud(interpretarSalud(503, caido))).toEqual([
      { nombre: "Base de datos", ok: true, detalle: "UP" },
      { nombre: "Canal ultima-posicion", ok: true, detalle: "[OK]" },
      { nombre: "Canal historial-telemetria", ok: false, detalle: "[KO] - fallo de BD" },
    ])
  })
})
