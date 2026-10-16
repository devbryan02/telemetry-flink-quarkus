package dev.bryan.viajes;
import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import dev.bryan.InMemoryKafkaResource;
import io.quarkus.test.common.QuarkusTestResource;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import java.util.*;
import org.junit.jupiter.api.Test;
/**
 * La caída de BD (readiness 503, canal detenido, reproceso) y el lag de Kafka se prueban con
 * servicios reales en scripts/probar-persistencia.ps1: aquí los canales son en memoria.
 */
@QuarkusTest
@QuarkusTestResource(InMemoryKafkaResource.class)
class RecuperacionTest {
    @Inject ViajesConsumer consumer;

    @Path("/test/fallo-bd")
    @Produces(MediaType.APPLICATION_JSON)
    public static class FalloBdResource {
        @GET public String fallar(){
            throw new IllegalStateException("No se pudo consultar",
                new RuntimeException("jdbc:postgresql://postgres:5432/e2e password=secreto SELECT * FROM tb_viaje"));
        }
    }

    @Test void exponeReadinessYMetricasSinFallarPorViajesAbiertos(){
        consumer.recibir(List.of(new EventoViaje("recuperacion",null,null,0,0,0,"ON",100,1000,2,UUID.randomUUID(),
            UUID.randomUUID(),UUID.randomUUID(),"ruta",1000L,"INICIO",null)));
        given().get("/q/health/ready").then().statusCode(200).body("status",equalTo("UP"));
        String metricas=given().get("/q/metrics").then().statusCode(200).extract().asString();
        assertTrue(metricas.contains("viajes_eventos_insertados_total"));
        double sinCierre=Double.parseDouble(metricas.lines().filter(l->l.startsWith("viajes_sin_cierre "))
            .findFirst().orElseThrow(()->new AssertionError("Falta viajes_sin_cierre")).split(" ")[1]);
        assertTrue(sinCierre>=1);
    }

    @Test void errorInternoNoExponeDetallesDeBd(){
        String cuerpo=given().get("/test/fallo-bd").then().statusCode(500)
            .body("code",equalTo("INTERNAL_ERROR")).body("requestId",notNullValue()).extract().asString();
        for(String interno:List.of("jdbc","secreto","SELECT"))assertFalse(cuerpo.contains(interno),cuerpo);
    }

    @Test void conflictoIdentificaEventoYViaje(){
        UUID id=UUID.randomUUID(),viaje=UUID.randomUUID(),carrera=UUID.randomUUID();
        consumer.recibir(List.of(new EventoViaje("conflicto",null,null,0,0,0,"ON",100,1000,2,id,carrera,viaje,"ruta",1000L,"INICIO",null)));
        var ex=assertThrows(IllegalStateException.class,()->consumer.recibir(List.of(
            new EventoViaje("conflicto",null,null,0,1,0,"ON",100,1000,2,id,carrera,viaje,"ruta",1000L,"INICIO",null))));
        assertTrue(ex.getMessage().contains(id.toString())&&ex.getMessage().contains(viaje.toString()),ex.getMessage());
    }
}
