# ADR-001: Grafo de conocimiento local con graphify, para ahorrar tokens

El proyecto usa **graphify** para indexar el código en un grafo de conocimiento local y consultarlo en vez de leer todo el código o inferir la estructura de memoria.

- Build inicial: `graphify extract . --code-only`.
- Reindexar tras cambios (solo AST, sin costo de API): `graphify update .` — ejecutar como último paso de cada tarea/commit.
- Consultar sin releer código: `graphify query "<pregunta>"`, `graphify path "<A>" "<B>"`, `graphify explain "<concepto>"`.
- Salida en la raíz del repo, no versionada: `graphify-out/graph.json`, `graphify-out/GRAPH_REPORT.md`, `graphify-out/wiki/` (si se generó).
