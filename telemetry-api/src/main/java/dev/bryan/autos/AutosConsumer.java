package dev.bryan.autos;

import io.smallrye.common.annotation.NonBlocking;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.util.List;
import org.eclipse.microprofile.reactive.messaging.Incoming;

/** Consume {@code ultima-posicion} y mantiene el {@link AutosStore} (spec §9, RF-Q1). */
@ApplicationScoped
class AutosConsumer {

    @Inject
    AutosStore store;

    /**
     * Recibe los registros por lotes ({@code batch=true}) y en el event loop: actualizar el store es
     * trivial. Con un {@code void recibir(Auto)} Quarkus lo trata como bloqueante y procesa cada
     * mensaje en un worker con un salto de hilo, lo que no alcanza los 5.000 msg/s.
     */
    @Incoming("ultima-posicion")
    @NonBlocking
    void recibir(List<Auto> lote) {
        for (Auto auto : lote) {
            store.actualizar(auto);
        }
    }
}
