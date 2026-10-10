package dev.bryan.simulacion;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasSize;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import dev.bryan.InMemoryKafkaResource;
import io.quarkus.test.common.QuarkusTestResource;
import io.quarkus.test.junit.QuarkusTest;
import io.smallrye.reactive.messaging.kafka.Record;
import io.smallrye.reactive.messaging.memory.InMemoryConnector;
import io.smallrye.reactive.messaging.memory.InMemorySink;
import jakarta.enterprise.inject.Any;
import jakarta.inject.Inject;
import java.util.Set;
import java.util.stream.Collectors;
import org.awaitility.Awaitility;
import org.junit.jupiter.api.Test;

@QuarkusTest
@QuarkusTestResource(InMemoryKafkaResource.class)
class SimulacionResourceTest {

    @Inject
    @Any
    InMemoryConnector connector;

    @Test
    void iniciaPublicaLosTresAutosYSeDetiene() {
        InMemorySink<Record<String, String>> telemetria = connector.sink("telemetria-out");
        telemetria.clear();

        given().when().get("/simulacion").then().statusCode(200).body("enCurso", equalTo(false));

        given().when().post("/simulacion/iniciar")
                .then().statusCode(200)
                .body("enCurso", equalTo(true))
                .body("autos", equalTo(3))
                .body("escenario", equalTo("av-brasil"));

        // posición inicial inmediata y luego un evento por auto cada segundo
        Awaitility.await().until(() -> telemetria.received().size() >= 6);
        Set<String> claves = telemetria.received().stream()
                .map(m -> m.getPayload().key()).collect(Collectors.toSet());
        assertEquals(Set.of("auto-1", "auto-2", "auto-3"), claves);
        String evento = telemetria.received().get(0).getPayload().value();
        assertTrue(evento.contains("\"companyId\":\"emp-0") && evento.contains("\"heading\""), evento);

        given().when().post("/simulacion/detener").then().statusCode(200).body("enCurso", equalTo(false));
        int publicados = telemetria.received().size();
        Awaitility.await().pollDelay(java.time.Duration.ofMillis(1500)).until(() -> true);
        assertEquals(publicados, telemetria.received().size(), "detenida no publica más");
    }

    @Test
    void sirveLaRutaComoGeoJsonConSusDosCalzadas() {
        given().when().get("/rutas/av-brasil")
                .then().statusCode(200)
                .header("Content-Type", containsString("geo+json"))
                .body("type", equalTo("FeatureCollection"))
                .body("features", hasSize(2))
                .body("features.properties.sentido", org.hamcrest.Matchers.contains("ida", "vuelta"));
    }

    @Test
    void unaRutaInexistenteDevuelve404() {
        given().when().get("/rutas/no-existe").then().statusCode(404).body("code", equalTo("RUTA_NO_ENCONTRADA"));
        given().when().get("/rutas/..%2F..%2Fapplication.properties").then().statusCode(404);
    }
}
