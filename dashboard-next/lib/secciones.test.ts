import { describe, expect, it } from "vitest"

import { seccionActiva } from "./secciones"

describe("seccionActiva", () => {
  it("la raíz es Carrera", () => expect(seccionActiva("/")).toBe("/"))
  it("una subruta pertenece a su sección", () => expect(seccionActiva("/viajes/1b4e28ba-2fa1-11d2-883f-0016d3cca427")).toBe("/viajes"))
  it("no confunde prefijos parecidos", () => expect(seccionActiva("/viajesx")).toBeNull())
  it("una ruta desconocida no activa nada", () => expect(seccionActiva("/otra")).toBeNull())
})
