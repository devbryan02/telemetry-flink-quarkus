package dev.bryan.viajes;
import static org.junit.jupiter.api.Assertions.*;
import static io.restassured.RestAssured.given;
import dev.bryan.InMemoryKafkaResource;
import io.quarkus.test.common.QuarkusTestResource;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import javax.sql.DataSource;
import java.util.*;
import org.junit.jupiter.api.*;
@QuarkusTest
@QuarkusTestResource(InMemoryKafkaResource.class)
class ViajesResourceTest {
    @Inject ViajesStore store;
    @Inject DataSource ds;
    @BeforeEach void preparar() throws Exception {
        try(var c=ds.getConnection();var s=c.createStatement()){
            s.executeUpdate("DELETE FROM tb_posicion_historial");s.executeUpdate("DELETE FROM tb_viaje");
        }
        store.guardarLote(List.of(ViajesStoreTest.evento(1,1000,"INICIO",null),
            ViajesStoreTest.evento(2,1000,"POSICION",null),ViajesStoreTest.evento(3,2000,"POSICION",null)));
    }
    @Test void paginaEmpatesSinRepetirYVinculaCursorAFiltros() {
        String path="/viajes/"+ViajesStoreTest.VIAJE+"/posiciones";
        var primera=given().queryParam("limit",1).get(path).then().statusCode(200).extract().jsonPath();
        assertEquals(1,primera.getList("items").size());
        Set<String> ids=new HashSet<>();ids.add(primera.getString("items[0].eventId"));
        String cursor=primera.getString("nextCursor");
        assertNotNull(cursor);
        given().queryParam("limit",2).queryParam("cursor",cursor).get(path).then().statusCode(400);
        while(cursor!=null){
            var p=given().queryParam("limit",1).queryParam("cursor",cursor).get(path).then().statusCode(200).extract().jsonPath();
            ids.add(p.getString("items[0].eventId"));cursor=p.getString("nextCursor");
        }
        assertEquals(3,ids.size());
        given().queryParam("carId","' OR 1=1--").get("/viajes").then().statusCode(200).body("items.size()",org.hamcrest.Matchers.equalTo(0));
    }
    @Test void filtraBordesYValidaParametros() {
        String path="/viajes/"+ViajesStoreTest.VIAJE+"/posiciones";
        given().queryParam("desde",1000).queryParam("hasta",2000).get(path).then().statusCode(200).body("items.size()",org.hamcrest.Matchers.equalTo(2));
        for(String query:List.of("?limit=0","?limit=1001","?desde=2000&hasta=1000","?cursor=basura","?carreraId=no-uuid")){
            given().get("/viajes"+query).then().statusCode(400).body("requestId",org.hamcrest.Matchers.notNullValue());
        }
        given().get("/viajes/"+UUID.randomUUID()+"/posiciones").then().statusCode(404);
        given().queryParam("desde",2000).queryParam("hasta",2000).get(path).then().statusCode(200).body("items.size()",org.hamcrest.Matchers.equalTo(0));
    }
}
