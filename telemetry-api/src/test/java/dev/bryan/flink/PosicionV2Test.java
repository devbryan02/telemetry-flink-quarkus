package dev.bryan.flink;
import static org.junit.jupiter.api.Assertions.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
class PosicionV2Test {
    @Test void transmiteContextoCompleto() throws Exception {
        var d=new PosicionJson.Deserializador();
        var p=d.deserialize(getClass().getResourceAsStream("/eventos/v2.json").readAllBytes());
        var json=new ObjectMapper().readTree(new PosicionJson.Serializador().serialize(p));
        assertEquals("00000000-0000-0000-0000-000000000003",json.path("viajeId").asText());
        assertEquals("POSICION",json.path("tipoEvento").asText());
    }
}
