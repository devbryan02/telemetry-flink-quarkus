package dev.bryan.flink;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;

class PosicionJsonTest {

    private final PosicionJson.Deserializador deserializador = new PosicionJson.Deserializador();

    private Posicion leer(String json) {
        return deserializador.deserialize(json.getBytes(StandardCharsets.UTF_8));
    }

    @Test
    void leeElContratoCompleto() {
        Posicion p = leer("{\"carId\":\"auto-1\",\"companyId\":\"emp-03\",\"fleetId\":\"emp-03-f2\","
                + "\"lat\":-12.05,\"lon\":-77.04,\"heading\":135,\"engine\":\"ON\",\"battery\":87,\"ts\":10}");

        assertEquals(new Posicion("auto-1", "emp-03", "emp-03-f2", -12.05, -77.04, 135, "ON", 87, 10), p);
    }

    @Test
    void aceptaEventosSinLosCamposNuevosYConCamposDesconocidos() {
        Posicion p = leer("{\"carId\":\"auto-1\",\"lat\":-12.05,\"lon\":-77.04,\"engine\":\"OFF\","
                + "\"battery\":50,\"ts\":10,\"extra\":true}");

        assertEquals("auto-1", p.carId());
        assertNull(p.companyId());
        assertNull(p.fleetId());
        assertEquals(0, p.heading());
    }

    @Test
    void unMensajeInvalidoSeDescarta() {
        assertNull(leer("no es json"));
    }

    @Test
    void serializaTodosLosCampos() {
        Posicion p = new Posicion("auto-1", "emp-03", "emp-03-f2", -12.05, -77.04, 135, "ON", 87, 10);

        assertEquals(p, leer(new String(new PosicionJson.Serializador().serialize(p), StandardCharsets.UTF_8)));
    }
}
