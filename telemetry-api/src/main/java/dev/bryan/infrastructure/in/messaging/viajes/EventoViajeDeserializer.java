package dev.bryan.infrastructure.in.messaging.viajes;
import org.apache.kafka.common.serialization.Deserializer;
import org.apache.kafka.common.errors.SerializationException;
import dev.bryan.domain.model.EventoViaje;
public class EventoViajeDeserializer implements Deserializer<EventoViaje> {
    public EventoViaje deserialize(String topic,byte[] bytes) {
        try{return EventoJson.leer(bytes,EventoViaje.class);}
        catch(Exception ex){throw new SerializationException("Evento de viaje invalido",ex);}
    }
}
