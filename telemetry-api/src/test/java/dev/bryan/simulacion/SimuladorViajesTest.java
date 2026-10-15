package dev.bryan.simulacion;
import static org.junit.jupiter.api.Assertions.*;
import com.fasterxml.jackson.databind.*;
import dev.bryan.InMemoryKafkaResource;
import io.quarkus.test.common.QuarkusTestResource;
import io.quarkus.test.junit.QuarkusTest;
import io.smallrye.reactive.messaging.memory.*;
import io.smallrye.reactive.messaging.kafka.Record;
import jakarta.enterprise.inject.Any;
import jakarta.inject.Inject;
import java.util.*;
import org.junit.jupiter.api.*;
@QuarkusTest
@QuarkusTestResource(InMemoryKafkaResource.class)
class SimuladorViajesTest {
    @Inject Simulador sim;
    @Inject PublicadorTelemetria publicador;
    @Inject @Any InMemoryConnector connector;
    @Inject ObjectMapper mapper;
    @BeforeEach void preparar() {
        sim.detener();publicador.pendientes().toCompletableFuture().join();connector.sink("telemetria-out").clear();
    }
    @AfterEach void detener(){sim.detener();for(var id:List.of("auto-1","auto-2","auto-3"))sim.velocidad(id,60);}
    List<JsonNode> eventos() throws Exception {
        publicador.pendientes().toCompletableFuture().join();
        InMemorySink<Record<String,String>> sink=connector.sink("telemetria-out");
        List<JsonNode> eventos=new ArrayList<>();
        for(var m:sink.received())eventos.add(mapper.readTree(m.getPayload().value()));
        return eventos;
    }
    @Test void tresViajesCompartenCarreraYReemplazoCierraAnteriores() throws Exception {
        var primera=sim.iniciar("av-brasil");
        var e=eventos();
        assertEquals(3,e.size());
        assertEquals(3,e.stream().map(n->n.path("viajeId").asText()).distinct().count());
        assertEquals(1,e.stream().map(n->n.path("carreraId").asText()).distinct().count());
        assertTrue(e.stream().allMatch(n->n.path("tipoEvento").asText().equals("INICIO")));
        assertNotNull(primera.carreraId());
        sim.iniciar("panamericana-sur");
        e=eventos();
        assertEquals(3,e.stream().filter(n->n.path("motivoFin").asText().equals("REEMPLAZADO")).count());
        assertEquals(6,e.stream().filter(n->n.path("tipoEvento").asText().equals("INICIO")).count());
        assertNotEquals(primera.carreraId(),sim.estado().carreraId());
    }
    @Test void rutaInvalidaNoCierraYParadaSoloCierraUnaVez() throws Exception {
        sim.iniciar("av-brasil");
        assertThrows(RuntimeException.class,()->sim.iniciar("no-existe"));
        assertEquals(3,eventos().size());
        sim.detener();sim.detener();
        assertEquals(3,eventos().stream().filter(n->"DETENIDO".equals(n.path("motivoFin").asText())).count());
    }
    @Test void metaCierraCadaAutoSinDuplicarAlDetener() throws Exception {
        for(var id:List.of("auto-1","auto-2","auto-3"))sim.velocidad(id,500);
        sim.iniciar("av-brasil");
        for(int i=0;i<60;i++)sim.avanzar();
        sim.detener();
        var e=eventos();
        assertEquals(3,e.stream().filter(n->"META".equals(n.path("motivoFin").asText())).count());
        assertEquals(3,e.stream().filter(n->"FIN".equals(n.path("tipoEvento").asText())).count());
    }
}
