package dev.bryan.viajes;
import io.smallrye.reactive.messaging.annotations.Blocking;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.util.List;
import org.eclipse.microprofile.reactive.messaging.*;
import org.jboss.logging.Logger;
@ApplicationScoped
class ViajesConsumer {
    private static final Logger LOG=Logger.getLogger(ViajesConsumer.class);
    @Inject ViajesStore store;
    @Inject ViajesMetricas metricas;
    @Incoming("historial-telemetria")
    @Blocking
    @Acknowledgment(Acknowledgment.Strategy.POST_PROCESSING)
    void recibir(List<EventoViaje> eventos) {
        try {
            var resultado=store.guardarLote(eventos);
            metricas.registrar(resultado);
            if(resultado.legados()>0)LOG.infof("Eventos legados excluidos del historial: %d",resultado.legados());
        }catch(IllegalArgumentException ex){metricas.invalido();throw ex;}
        catch(RuntimeException ex){metricas.falloPersistencia();throw ex;}
    }
}
