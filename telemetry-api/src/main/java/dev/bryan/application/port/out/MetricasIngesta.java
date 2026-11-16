package dev.bryan.application.port.out;

import dev.bryan.domain.model.ResultadoIngesta;

/** Señales operativas de las dos ingestas; sin etiquetas por auto ni por viaje. */
public interface MetricasIngesta {
    void viajesIngestados(ResultadoIngesta resultado);

    void viajeInvalido();

    void viajesFalloPersistencia();

    void autosFalloPersistencia();
}
