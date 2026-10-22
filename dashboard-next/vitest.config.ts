import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

// Dominio y paginación con adaptador de red en Node; la UI se verifica en el navegador.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./", import.meta.url)) } },
  test: { environment: "node", include: ["features/**/*.test.ts", "lib/**/*.test.ts"] },
})
