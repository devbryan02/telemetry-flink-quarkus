package dev.bryan.autos;
import io.smallrye.reactive.messaging.annotations.Blocking;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.util.List;
import org.eclipse.microprofile.reactive.messaging.*;
@ApplicationScoped
class AutosConsumer {
    @Inject AutosStore store;
    @Inject AutosCambios cambios;
    @Incoming("ultima-posicion")
    @Blocking
    @Acknowledgment(Acknowledgment.Strategy.POST_PROCESSING)
    void recibir(List<AutoEvento> lote) {
        cambios.registrar(store.guardarLote(lote));
    }
}
