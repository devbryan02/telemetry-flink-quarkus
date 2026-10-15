package dev.bryan.viajes;
import static org.junit.jupiter.api.Assertions.*;
import static io.restassured.RestAssured.given;
import dev.bryan.InMemoryKafkaResource;
import io.quarkus.test.common.QuarkusTestResource;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.util.*;
import javax.sql.DataSource;
import org.junit.jupiter.api.Test;
@QuarkusTest
@QuarkusTestResource(InMemoryKafkaResource.class)
class ViajeDetalleTest {
    @Inject ViajesStore store;
    @Inject DataSource ds;
    @Test void tardioModificaResumenSinReabrirViaje()throws Exception{
        try(var c=ds.getConnection();var s=c.createStatement()){
            s.executeUpdate("DELETE FROM tb_posicion_historial");s.executeUpdate("DELETE FROM tb_viaje");
        }
        store.guardarLote(List.of(ViajesStoreTest.evento(1,1000,"INICIO",null),ViajesStoreTest.evento(4,4000,"FIN","META")));
        String path="/viajes/"+ViajesStoreTest.VIAJE;
        var inicial=given().get(path).then().statusCode(200).extract().jsonPath();
        assertEquals(2,inicial.getInt("resumen.cantidadMuestras"));
        store.guardarLote(List.of(ViajesStoreTest.evento(2,2000,"POSICION",null)));
        var detalle=given().get(path).then().statusCode(200).extract().jsonPath();
        assertEquals(3,detalle.getInt("resumen.cantidadMuestras"));
        assertEquals("FINALIZADO",detalle.getString("viaje.estado"));
        assertEquals(4000,detalle.getLong("resumen.ultimoTs"));
        assertEquals(detalle.getLong("viaje.ultimoTs"),detalle.getLong("resumen.ultimoTs"));
        given().get("/viajes/"+UUID.randomUUID()).then().statusCode(404);
    }
}
