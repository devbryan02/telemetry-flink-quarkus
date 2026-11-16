package dev.bryan.infrastructure.in.messaging.viajes;

import dev.bryan.application.port.in.IngestarHistorialViajes;
import dev.bryan.domain.model.EventoViaje;
import io.smallrye.reactive.messaging.annotations.Blocking;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.util.List;
import org.eclipse.microprofile.reactive.messaging.Acknowledgment;
import org.eclipse.microprofile.reactive.messaging.Incoming;

/** Adaptador de entrada: lotes de {@code telemetria} para el historial de viajes. */
@ApplicationScoped
class ViajesConsumer {
    @Inject IngestarHistorialViajes ingesta;

    @Incoming("historial-telemetria")
    @Blocking
    @Acknowledgment(Acknowledgment.Strategy.POST_PROCESSING)
    void recibir(List<EventoViaje> eventos) {
        ingesta.ingestar(eventos);
    }
}
