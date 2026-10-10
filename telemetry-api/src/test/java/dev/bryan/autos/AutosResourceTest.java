package dev.bryan.autos;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.notNullValue;

import io.quarkus.test.common.QuarkusTestResource;
import io.quarkus.test.junit.QuarkusTest;
import io.smallrye.reactive.messaging.memory.InMemoryConnector;
import io.smallrye.reactive.messaging.memory.InMemorySource;
import jakarta.enterprise.inject.Any;
import jakarta.inject.Inject;
import java.util.List;
import org.awaitility.Awaitility;
import org.junit.jupiter.api.Test;

@QuarkusTest
@QuarkusTestResource(InMemoryKafkaResource.class)
class AutosResourceTest {

    @Inject
    @Any
    InMemoryConnector connector;

    @Inject
    AutosStore store;

    private void publicar(Auto auto) {
        InMemorySource<List<Auto>> fuente = connector.source("ultima-posicion");
        fuente.send(List.of(auto));  // el canal consume por lotes
    }

    @Test
    void devuelveUnRegistroPorAutoConElTsMasReciente() {
        publicar(new Auto("rest-1", null, null, -12.05, -77.05, 0, "ON", 90, 1000));
        publicar(new Auto("rest-1", null, null, -12.06, -77.06, 0, "OFF", 89, 2000));
        publicar(new Auto("rest-1", null, null, -12.00, -77.00, 0, "ON", 99, 500));   // viejo: se descarta
        publicar(new Auto("rest-2", null, null, -12.07, -77.07, 0, "ON", 70, 1500));

        Awaitility.await().until(() -> store.tamanio() >= 2);

        given().when().get("/autos?bbox=-77.065,-12.065,-77.055,-12.055")
                .then().statusCode(200)
                .body("$", hasSize(1))
                .body("[0].carId", equalTo("rest-1"))
                .body("[0].ts", equalTo(2000))
                .body("[0].engine", equalTo("OFF"));

        given().when().get("/autos")
                .then().statusCode(200)
                .body("findAll { it.carId == 'rest-1' }", hasSize(1))
                .body("findAll { it.carId == 'rest-2' }", hasSize(1));
    }

    @Test
    void bboxInvalidoDevuelve400ConContratoDeError() {
        given().when().get("/autos?bbox=abc")
                .then().statusCode(400)
                .body("status", equalTo(400))
                .body("code", equalTo("INVALID_BBOX"))
                .body("path", equalTo("/autos"))
                .body("requestId", notNullValue())
                .body(not(containsString("Exception")))
                .body(not(containsString("stackTrace")));
    }

    @Test
    void rutaInexistenteDevuelve404ConContratoDeError() {
        given().when().get("/no-existe")
                .then().statusCode(404)
                .body("code", equalTo("HTTP_404"))
                .body("requestId", notNullValue());
    }
}
