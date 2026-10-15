package dev.bryan.autos;
import static org.junit.jupiter.api.Assertions.*;
import dev.bryan.InMemoryKafkaResource;
import io.quarkus.test.common.QuarkusTestResource;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.util.List;
import org.junit.jupiter.api.Test;
@QuarkusTest
@QuarkusTestResource(InMemoryKafkaResource.class)
class AutosConsumerTest {
    @Inject AutosConsumer consumer;
    @Inject AutosStore store;
    @Inject AutosCambios cambios;
    @Test void rollbackNoPublicaCambios() {
        cambios.drenar();
        assertThrows(RuntimeException.class,()->consumer.recibir(List.of(
            AutosStoreTest.evento("consumer-a",100),
            new AutoEvento("consumer-z",null,null,100,0,0,"ON",100,100))));
        assertTrue(cambios.drenar().isEmpty());
        assertTrue(store.todos().stream().noneMatch(a->a.carId().startsWith("consumer-")));
    }
}
