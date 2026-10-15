package dev.bryan.autos;
import io.quarkus.kafka.client.serialization.ObjectMapperDeserializer;
public class AutoEventoDeserializer extends ObjectMapperDeserializer<AutoEvento> {
    public AutoEventoDeserializer() { super(AutoEvento.class); }
}
