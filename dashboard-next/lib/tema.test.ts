import { describe, expect, it } from "vitest"

import { siguienteTema } from "./tema"

describe("siguienteTema", () => {
  it("rota claro → oscuro → sistema → claro", () => {
    expect(siguienteTema("light")).toBe("dark")
    expect(siguienteTema("dark")).toBe("system")
    expect(siguienteTema("system")).toBe("light")
  })
  it("sin tema guardado empieza por claro", () => expect(siguienteTema(undefined)).toBe("light"))
})
