package dev.bryan.autos;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.reactive.messaging.Incoming;

/** Consume {@code ultima-posicion} y mantiene el {@link AutosStore} (spec §9, RF-Q1). */
@ApplicationScoped
class AutosConsumer {

    @Inject
    AutosStore store;

    @Incoming("ultima-posicion")
    void recibir(Auto auto) {
        store.actualizar(auto);
    }
}
