package dev.bryan.infrastructure.in.messaging.autos;
import org.apache.kafka.common.serialization.Deserializer;
import org.apache.kafka.common.errors.SerializationException;
import dev.bryan.domain.model.AutoEvento;
public class AutoEventoDeserializer implements Deserializer<AutoEvento> {
    @Override public AutoEvento deserialize(String topic,byte[] bytes) {
        try { return EventoJson.leer(bytes,AutoEvento.class); }
        catch(Exception ex){throw new SerializationException("Evento de posicion invalido",ex);}
    }
}
