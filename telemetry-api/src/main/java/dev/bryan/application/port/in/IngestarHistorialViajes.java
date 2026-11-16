package dev.bryan.application.port.in;

import dev.bryan.domain.model.EventoViaje;
import dev.bryan.domain.model.ResultadoIngesta;
import java.util.List;

public interface IngestarHistorialViajes {
    /** Ingesta idempotente por `eventId`; un evento inválido o un fallo de persistencia se propaga. */
    ResultadoIngesta ingestar(List<EventoViaje> eventos);
}
