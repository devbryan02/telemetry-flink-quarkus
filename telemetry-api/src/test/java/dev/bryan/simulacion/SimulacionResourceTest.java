package dev.bryan.simulacion;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.notNullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import dev.bryan.InMemoryKafkaResource;
import io.quarkus.test.common.QuarkusTestResource;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import io.smallrye.reactive.messaging.kafka.Record;
import io.smallrye.reactive.messaging.memory.InMemoryConnector;
import io.smallrye.reactive.messaging.memory.InMemorySink;
import jakarta.enterprise.inject.Any;
import jakarta.inject.Inject;
import java.time.Duration;
import java.util.Set;
import java.util.stream.Collectors;
import org.awaitility.Awaitility;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

@QuarkusTest
@QuarkusTestResource(InMemoryKafkaResource.class)
class SimulacionResourceTest {

    @Inject
    @Any
    InMemoryConnector connector;

    @AfterEach
    void detener() {
        given().post("/simulacion/detener");
        for (String auto : new String[] {"auto-1", "auto-2", "auto-3"}) {
            given().contentType(ContentType.JSON).body("{\"kmh\":60}").put("/simulacion/autos/" + auto + "/velocidad");
        }
    }

    private static io.restassured.response.ValidatableResponse iniciar(String ruta) {
        return given().contentType(ContentType.JSON).body("{\"ruta\":\"" + ruta + "\"}")
                .when().post("/simulacion/iniciar").then();
    }

    @Test
    void listaLasRutasEstablecidas() {
        given().when().get("/rutas")
                .then().statusCode(200)
                .body("id", contains("av-brasil", "panamericana-sur", "panamericana-norte", "via-los-libertadores"))
                .body("km", everyItem(notNullValue()));
    }

    @Test
    void sirveLaGeometriaDeUnaRutaComoUnaSolaLinea() {
        given().when().get("/rutas/panamericana-sur")
                .then().statusCode(200)
                .header("Content-Type", containsString("geo+json"))
                .body("features", hasSize(1))
                .body("features[0].geometry.type", equalTo("LineString"))
                .body("features[0].properties.nombre", equalTo("Panamericana Sur"));
    }

    @Test
    void todosSalenDelMismoPuntoYSeOrdenanPorDistancia() {
        InMemorySink<Record<String, String>> telemetria = connector.sink("telemetria-out");
        telemetria.clear();

        iniciar("panamericana-sur").statusCode(200)
                .body("estado", equalTo("EN_CURSO"))
                .body("ruta", equalTo("panamericana-sur"))
                .body("autos", hasSize(3));

        // la primera tanda (salida) tiene los 3 autos en la misma posición
        Awaitility.await().until(() -> telemetria.received().size() >= 3);
        Set<String> salidas = telemetria.received().subList(0, 3).stream()
                .map(m -> m.getPayload().value().replaceAll(".*\"lat\":([-0-9.]+),\"lon\":([-0-9.]+).*", "$1,$2"))
                .collect(Collectors.toSet());
        assertEquals(1, salidas.size(), "misma salida para todos: " + salidas);

        // el más rápido va primero
        given().contentType(ContentType.JSON).body("{\"kmh\":400}").put("/simulacion/autos/auto-2/velocidad")
                .then().statusCode(200);
        Awaitility.await().atMost(Duration.ofSeconds(5)).untilAsserted(() ->
                given().get("/simulacion").then().body("autos[0].carId", equalTo("auto-2")).body("autos[0].posicion", equalTo(1)));
    }

    @Test
    void enUnaRutaCortaYRapidaLaCarreraTerminaConLosTiemposDeLlegada() {
        for (String auto : new String[] {"auto-1", "auto-2", "auto-3"}) {
            given().contentType(ContentType.JSON).body("{\"kmh\":500}").put("/simulacion/autos/" + auto + "/velocidad");
        }
        iniciar("av-brasil").statusCode(200);

        // 5,2 km a 500 km/h ≈ 38 s
        Awaitility.await().atMost(Duration.ofSeconds(60)).pollInterval(Duration.ofSeconds(1)).untilAsserted(() ->
                given().get("/simulacion").then().body("estado", equalTo("TERMINADA")));
        io.restassured.path.json.JsonPath estado = given().get("/simulacion").jsonPath();
        assertTrue(estado.getList("autos.llegadaMs").stream().allMatch(java.util.Objects::nonNull), "todos llegaron");
        assertEquals(estado.getDouble("longitudM"), estado.getDouble("autos[0].recorridoM"), 0.1);
    }

    @Test
    void validaVelocidadRutaYAuto() {
        given().contentType(ContentType.JSON).body("{\"kmh\":5}").put("/simulacion/autos/auto-1/velocidad")
                .then().statusCode(400).body("code", equalTo("VELOCIDAD_INVALIDA"));
        given().contentType(ContentType.JSON).body("{\"kmh\":100}").put("/simulacion/autos/auto-9/velocidad")
                .then().statusCode(404).body("code", equalTo("AUTO_NO_ENCONTRADO"));
        iniciar("no-existe").statusCode(404).body("code", equalTo("RUTA_NO_ENCONTRADA"));
        given().contentType(ContentType.JSON).body("{}").post("/simulacion/iniciar")
                .then().statusCode(400).body("code", equalTo("RUTA_REQUERIDA"));
        given().get("/rutas/..%2F..%2Fapplication.properties").then().statusCode(404);
    }
}
