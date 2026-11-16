package dev.bryan.application.port.out;

import dev.bryan.domain.model.EventoViaje;
import dev.bryan.domain.model.ResultadoIngesta;
import java.util.List;

public interface ViajesRepositorio {
    /** Ingesta idempotente y transaccional; la transacción termina antes de devolver el resultado. */
    ResultadoIngesta guardarLote(List<EventoViaje> eventos);
}
