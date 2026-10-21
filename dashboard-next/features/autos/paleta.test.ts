import { describe, expect, it } from "vitest"

import { indiceColor, varColor } from "./paleta"

describe("indiceColor", () => {
  it("usa el número de auto-N", () => {
    expect(indiceColor("auto-1")).toBe(1)
    expect(indiceColor("auto-2")).toBe(2)
    expect(indiceColor("auto-3")).toBe(3)
  })
  it("vuelve a empezar después del 3", () => expect(indiceColor("auto-4")).toBe(1))
  it("ids sin número dan un índice estable entre 1 y 3", () => {
    const i = indiceColor("car-xyz")
    expect([1, 2, 3]).toContain(i)
    expect(indiceColor("car-xyz")).toBe(i)
  })
})

describe("varColor", () => {
  it("referencia el token del tema", () => expect(varColor("auto-2")).toBe("var(--auto-2)"))
})
