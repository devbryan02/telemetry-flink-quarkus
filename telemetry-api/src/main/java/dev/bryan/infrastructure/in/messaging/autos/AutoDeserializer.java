package dev.bryan.infrastructure.in.messaging.autos;

import io.quarkus.kafka.client.serialization.ObjectMapperDeserializer;
import dev.bryan.domain.model.Auto;

/** Deserializador JSON de {@link Auto} para el consumidor Kafka. */
public class AutoDeserializer extends ObjectMapperDeserializer<Auto> {
    public AutoDeserializer() {
        super(Auto.class);
    }
}
