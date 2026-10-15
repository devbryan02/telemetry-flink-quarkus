package dev.bryan.viajes;
import io.smallrye.common.annotation.Identifier;
import io.smallrye.reactive.messaging.kafka.DeserializationFailureHandler;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.apache.kafka.common.header.Headers;
import org.apache.kafka.common.errors.SerializationException;
@ApplicationScoped
@Identifier("historial-invalido")
class EventoViajeFailureHandler implements DeserializationFailureHandler<EventoViaje> {
    @Inject ViajesMetricas metricas;
    @Override public EventoViaje handleDeserializationFailure(String topic,boolean isKey,String deserializer,
        byte[] data,Exception exception,Headers headers){
        metricas.invalido();
        throw new SerializationException("Evento historico invalido",exception);
    }
}
