import { describe, expect, it } from "vitest"

import { parsearPrometheus, tasaPorSegundo, valor, valorMaximo } from "./prometheus"

const TEXTO = `# HELP viajes_sin_cierre Viajes sin cierre
# TYPE viajes_sin_cierre gauge
viajes_sin_cierre 3.0
viajes_eventos_insertados_total 1200.0
kafka_consumer_fetch_manager_records_lag_max{client_id="kafka-consumer-ultima-posicion",kafka_version="4.2.1"} 0.0
kafka_consumer_fetch_manager_records_lag_max{client_id="kafka-consumer-historial-telemetria",kafka_version="4.2.1"} 12.0
autos_persistencia_fallos_total NaN
`

describe("parsearPrometheus", () => {
  const ms = parsearPrometheus(TEXTO)
  it("ignora comentarios y lee nombre, etiquetas y valor", () => {
    expect(ms).toHaveLength(5)
    expect(valor(ms, "viajes_sin_cierre")).toBe(3)
  })
  it("filtra por etiquetas", () => {
    expect(valor(ms, "kafka_consumer_fetch_manager_records_lag_max", { client_id: "kafka-consumer-historial-telemetria" })).toBe(12)
  })
  it("NaN o una métrica ausente dan null", () => {
    expect(valor(ms, "autos_persistencia_fallos_total")).toBeNull()
    expect(valor(ms, "no_existe")).toBeNull()
  })
})

describe("tasaPorSegundo", () => {
  it("diferencia de contador entre dos lecturas", () => expect(tasaPorSegundo(1_200, 1_215, 5_000)).toBe(3))
  it("sin lectura anterior, con reinicio del contador o sin tiempo no hay tasa", () => {
    expect(tasaPorSegundo(null, 10, 5_000)).toBeNull()
    expect(tasaPorSegundo(500, 10, 5_000)).toBeNull()
    expect(tasaPorSegundo(1, 2, 0)).toBeNull()
  })
})

describe("valorMaximo", () => {
  it("toma el mayor lag finito entre particiones del canal, ignorando NaN", () => {
    const ms = parsearPrometheus('lag{client_id="a",partition="0"} NaN\nlag{client_id="a",partition="1"} 12\nlag{client_id="a",partition="2"} 8\nlag{client_id="b"} 999');
    expect(valorMaximo(ms, "lag", { client_id: "a" })).toBe(12)
    expect(valorMaximo(ms, "ausente")).toBeNull()
  })
})
