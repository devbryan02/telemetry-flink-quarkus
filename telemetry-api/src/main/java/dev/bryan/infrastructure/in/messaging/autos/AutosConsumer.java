package dev.bryan.infrastructure.in.messaging.autos;

import dev.bryan.application.port.in.IngestarUltimasPosiciones;
import dev.bryan.domain.model.AutoEvento;
import io.smallrye.reactive.messaging.annotations.Blocking;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.util.List;
import org.eclipse.microprofile.reactive.messaging.Acknowledgment;
import org.eclipse.microprofile.reactive.messaging.Incoming;

/** Adaptador de entrada: lotes de {@code ultima-posicion}; el commit JDBC ocurre antes del ack. */
@ApplicationScoped
class AutosConsumer {
    @Inject IngestarUltimasPosiciones ingesta;

    @Incoming("ultima-posicion")
    @Blocking
    @Acknowledgment(Acknowledgment.Strategy.POST_PROCESSING)
    void recibir(List<AutoEvento> lote) {
        ingesta.ingestar(lote);
    }
}
