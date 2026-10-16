package dev.bryan.viajes;
import static org.junit.jupiter.api.Assertions.*;
import dev.bryan.InMemoryKafkaResource;
import io.quarkus.test.common.QuarkusTestResource;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.util.List;
import org.junit.jupiter.api.Test;
@QuarkusTest
@QuarkusTestResource(InMemoryKafkaResource.class)
class ViajesConsumerTest {
    @Inject ViajesStore store;
    @Test void legadoSeExcluyeYV2IncompletoNoSeAcepta() {
        var r=store.guardarLote(List.of(new EventoViaje("legacy",null,null,0,0,0,"ON",100,1000)));
        assertEquals(1,r.legados());assertEquals(0,r.insertados());
        try(var d=new EventoViajeDeserializer()){
            assertThrows(RuntimeException.class,()->d.deserialize("telemetria","{}".getBytes()));
        }
    }
}
