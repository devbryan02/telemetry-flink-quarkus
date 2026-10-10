package dev.bryan.autos;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;

class AutoDeserializerTest {

    private Auto leer(String json) {
        try (AutoDeserializer d = new AutoDeserializer()) {
            return d.deserialize("ultima-posicion", json.getBytes(StandardCharsets.UTF_8));
        }
    }

    @Test
    void leeElContratoCompleto() {
        Auto a = leer("{\"carId\":\"auto-1\",\"companyId\":\"emp-03\",\"fleetId\":\"emp-03-f2\","
                + "\"lat\":-12.05,\"lon\":-77.04,\"heading\":135,\"engine\":\"ON\",\"battery\":87,\"ts\":10}");

        assertEquals(new Auto("auto-1", "emp-03", "emp-03-f2", -12.05, -77.04, 135, "ON", 87, 10), a);
    }

    @Test
    void unAutoParticularTieneEmpresaYFlotaNulas() {
        Auto a = leer("{\"carId\":\"auto-9\",\"companyId\":null,\"fleetId\":null,"
                + "\"lat\":-12.05,\"lon\":-77.04,\"heading\":10,\"engine\":\"OFF\",\"battery\":50,\"ts\":10}");

        assertNull(a.companyId());
        assertNull(a.fleetId());
    }

    @Test
    void aceptaEventosAnterioresSinLosCamposNuevos() {
        Auto a = leer("{\"carId\":\"auto-1\",\"lat\":-12.05,\"lon\":-77.04,\"engine\":\"OFF\",\"battery\":50,\"ts\":10}");

        assertEquals("auto-1", a.carId());
        assertNull(a.companyId());
        assertEquals(0, a.heading());
    }
}
