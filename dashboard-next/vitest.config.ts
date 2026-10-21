import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

// Solo funciones puras de features/*: la UI se verifica con lint, build y el navegador.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./", import.meta.url)) } },
  test: { environment: "node", include: ["features/**/*.test.ts"] },
})
