package dev.bryan;

import io.quarkus.test.common.QuarkusTestResourceLifecycleManager;
import io.smallrye.reactive.messaging.memory.InMemoryConnector;
import java.util.HashMap;
import java.util.Map;

/** Sustituye los canales Kafka por canales en memoria durante las pruebas. */
public class InMemoryKafkaResource implements QuarkusTestResourceLifecycleManager {

    @Override
    public Map<String, String> start() {
        Map<String, String> config = new HashMap<>();
        config.putAll(InMemoryConnector.switchIncomingChannelsToInMemory("ultima-posicion"));
        config.putAll(InMemoryConnector.switchOutgoingChannelsToInMemory("telemetria-out"));
        return config;
    }

    @Override
    public void stop() {
        InMemoryConnector.clear();
    }
}
