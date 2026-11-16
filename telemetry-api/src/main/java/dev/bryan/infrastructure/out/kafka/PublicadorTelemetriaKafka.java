package dev.bryan.infrastructure.out.kafka;
import com.fasterxml.jackson.databind.ObjectMapper;
import dev.bryan.application.port.out.PublicadorTelemetria;
import io.smallrye.reactive.messaging.kafka.Record;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.reactive.messaging.Channel;
import org.eclipse.microprofile.reactive.messaging.Emitter;
import org.jboss.logging.Logger;
import java.util.*;
import java.util.concurrent.*;
import dev.bryan.domain.model.TelemetriaEvento;
/** Serializa una vez y conserva el orden de publicación por auto sin bloquear Vert.x. */
@ApplicationScoped
class PublicadorTelemetriaKafka implements PublicadorTelemetria {
    private static final Logger LOG=Logger.getLogger(PublicadorTelemetriaKafka.class);
    @Inject ObjectMapper mapper;
    @Inject @Channel("telemetria-out") Emitter<Record<String,String>> telemetria;
    private final Map<String,CompletableFuture<Void>> pendientes=new HashMap<>();
    @Override public synchronized CompletionStage<Void> publicar(TelemetriaEvento evento){
        final String json;
        try{json=mapper.writeValueAsString(evento);}
        catch(Exception ex){LOG.errorf("No se pudo serializar evento %s",evento.eventId());return CompletableFuture.failedFuture(ex);}
        CompletableFuture<Void> resultado=new CompletableFuture<>();
        var anterior=pendientes.put(evento.carId(),resultado);
        CompletionStage<Void> listo=anterior==null?CompletableFuture.completedFuture(null):anterior.handle((ok,error)->null);
        listo.thenCompose(ignored->telemetria.send(Record.of(evento.carId(),json))).whenComplete((ok,error)->{
            if(error==null)resultado.complete(null);
            else {LOG.errorf("Publicacion fallida eventId=%s viajeId=%s",evento.eventId(),evento.viajeId());resultado.completeExceptionally(error);}
            synchronized(this){pendientes.remove(evento.carId(),resultado);}
        });
        return resultado;
    }
    @Override public synchronized CompletionStage<Void> pendientes(){
        return CompletableFuture.allOf(pendientes.values().toArray(CompletableFuture[]::new));
    }
}
