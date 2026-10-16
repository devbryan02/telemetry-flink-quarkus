package dev.bryan.autos;
import static org.junit.jupiter.api.Assertions.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
class ContratoV2Test {
    @Test void preservaContextoSinCambiarRepresentacionPublica() throws Exception {
        byte[] bytes=getClass().getResourceAsStream("/eventos/v2.json").readAllBytes();
        try(var d=new AutoEventoDeserializer()){
            var e=d.deserialize("ultima-posicion",bytes);
            var json=new ObjectMapper().valueToTree(e);
            assertEquals("00000000-0000-0000-0000-000000000003",json.path("viajeId").asText());
            assertEquals(9,new ObjectMapper().valueToTree(e.auto()).size());
        }
    }
    @Test void rechazaVersionDesconocidaYCamposObligatoriosAusentes() throws Exception {
        var m=new ObjectMapper();
        var json=(com.fasterxml.jackson.databind.node.ObjectNode)m.readTree(getClass().getResourceAsStream("/eventos/v2.json"));
        try(var d=new AutoEventoDeserializer()){
            json.remove("eventId");
            assertThrows(RuntimeException.class,()->d.deserialize("x",m.writeValueAsBytes(json)));
            json.put("schemaVersion",3);
            assertThrows(RuntimeException.class,()->d.deserialize("x",m.writeValueAsBytes(json)));
        }
    }
}
