package dev.bryan.viajes;
import static org.junit.jupiter.api.Assertions.*;
import dev.bryan.InMemoryKafkaResource;
import io.quarkus.test.common.QuarkusTestResource;
import io.quarkus.test.junit.QuarkusTest;
import io.micrometer.core.instrument.MeterRegistry;
import jakarta.inject.Inject;
import java.util.*;
import org.junit.jupiter.api.Test;
@QuarkusTest
@QuarkusTestResource(InMemoryKafkaResource.class)
class ViajesMetricasTest {
    @Inject MeterRegistry registry;
    @Inject ViajesConsumer consumer;
    @Test void cuentaSoloCambiosConfirmadosYLegadosExcluidos(){
        double antes=registry.counter("viajes.eventos.legados").count();
        consumer.recibir(List.of(new EventoViaje("legacy",null,null,0,0,0,"ON",100,1000)));
        assertEquals(antes+1,registry.counter("viajes.eventos.legados").count());
        UUID id=UUID.randomUUID(),viaje=UUID.randomUUID();
        var e=new EventoViaje("metricas",null,null,0,0,0,"ON",100,1000,2,id,UUID.randomUUID(),viaje,"ruta",1000L,"INICIO",null);
        double insertados=registry.counter("viajes.eventos.insertados").count();
        consumer.recibir(List.of(e));consumer.recibir(List.of(e));
        assertEquals(insertados+1,registry.counter("viajes.eventos.insertados").count());
        assertTrue(registry.counter("viajes.eventos.duplicados").count()>=1);
        var conflicto=new EventoViaje("metricas",null,null,0,1,0,"ON",100,1000,2,id,e.carreraId(),viaje,"ruta",1000L,"INICIO",null);
        assertThrows(RuntimeException.class,()->consumer.recibir(List.of(conflicto)));
        assertEquals(insertados+1,registry.counter("viajes.eventos.insertados").count());
    }
}
