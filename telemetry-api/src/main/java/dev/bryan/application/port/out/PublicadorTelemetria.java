package dev.bryan.application.port.out;

import dev.bryan.domain.model.TelemetriaEvento;
import java.util.concurrent.CompletionStage;

/** Publica eventos conservando el orden por auto. */
public interface PublicadorTelemetria {
    CompletionStage<Void> publicar(TelemetriaEvento evento);

    /** Se completa cuando todas las publicaciones en curso terminaron. */
    CompletionStage<Void> pendientes();
}
