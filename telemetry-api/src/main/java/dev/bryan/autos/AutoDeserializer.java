package dev.bryan.autos;

import io.quarkus.kafka.client.serialization.ObjectMapperDeserializer;

/** Deserializador JSON de {@link Auto} para el consumidor Kafka. */
public class AutoDeserializer extends ObjectMapperDeserializer<Auto> {
    public AutoDeserializer() {
        super(Auto.class);
    }
}
