package dev.bryan.infrastructure.in.messaging.viajes;
import dev.bryan.application.port.out.MetricasIngesta;
import io.smallrye.common.annotation.Identifier;
import io.smallrye.reactive.messaging.kafka.DeserializationFailureHandler;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.apache.kafka.common.header.Headers;
import org.apache.kafka.common.errors.SerializationException;
import dev.bryan.domain.model.EventoViaje;
@ApplicationScoped
@Identifier("historial-invalido")
class EventoViajeFailureHandler implements DeserializationFailureHandler<EventoViaje> {
    @Inject MetricasIngesta metricas;
    @Override public EventoViaje handleDeserializationFailure(String topic,boolean isKey,String deserializer,
        byte[] data,Exception exception,Headers headers){
        metricas.viajeInvalido();
        throw new SerializationException("Evento historico invalido",exception);
    }
}
