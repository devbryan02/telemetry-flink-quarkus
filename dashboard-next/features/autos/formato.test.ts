import { describe, expect, it } from "vitest"

import { cronometro, segundos, tiempoCarrera } from "./formato"

describe("cronometro", () => {
  it("formatea minutos con décima y coma", () => expect(cronometro(37_612)).toBe("0:37,6"))
  it("agrega horas cuando pasa de 60 min", () => expect(cronometro(3_723_400)).toBe("1:02:03,4"))
})

describe("segundos", () => {
  it("muestra guion sin dato", () => expect(segundos(null)).toBe("—"))
  it("una décima, con el separador de es-PE", () => expect(segundos(812)).toBe("0.8 s"))
})

describe("tiempoCarrera", () => {
  it("null sin inicio", () => expect(tiempoCarrera(null, 0)).toBeNull())
  it("ms desde el inicio", () =>
    expect(tiempoCarrera("2026-10-21T02:42:27.000Z", Date.parse("2026-10-21T02:44:01.500Z"))).toBe(94_500))
  it("nunca negativo (reloj del navegador atrasado)", () =>
    expect(tiempoCarrera("2026-10-21T02:42:27.000Z", Date.parse("2026-10-21T02:42:26.000Z"))).toBe(0))
})
