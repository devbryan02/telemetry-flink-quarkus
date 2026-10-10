package dev.bryan.autos;

import io.quarkus.test.common.QuarkusTestResourceLifecycleManager;
import io.smallrye.reactive.messaging.memory.InMemoryConnector;
import java.util.Map;

/** Sustituye el canal Kafka {@code ultima-posicion} por uno en memoria durante las pruebas. */
public class InMemoryKafkaResource implements QuarkusTestResourceLifecycleManager {

    @Override
    public Map<String, String> start() {
        return InMemoryConnector.switchIncomingChannelsToInMemory("ultima-posicion");
    }

    @Override
    public void stop() {
        InMemoryConnector.clear();
    }
}
