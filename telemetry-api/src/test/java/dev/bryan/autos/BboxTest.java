package dev.bryan.autos;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import dev.bryan.shared.error.NegocioException;
import jakarta.ws.rs.core.Response;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class BboxTest {

    @Test
    void contienePuntosDentroYExcluyeFuera() {
        Bbox bbox = Bbox.parse("-77.1,-12.1,-77.0,-12.0");

        assertTrue(bbox.contiene(new Auto("a", null, null, -12.05, -77.05, 0, "ON", 50, 1)));
        assertFalse(bbox.contiene(new Auto("b", null, null, -11.0, -77.05, 0, "ON", 50, 1)));
        assertFalse(bbox.contiene(new Auto("c", null, null, -12.05, -76.0, 0, "ON", 50, 1)));
    }

    @ParameterizedTest
    @ValueSource(strings = {"abc", "1,2,3", "1,2,3,4,5", "a,b,c,d", "-77,-12,-78,-11", "-200,-12,-77,-11",
            "-77,-12,-76,95", ",,,"})
    void bboxInvalidoDevuelve400(String texto) {
        NegocioException ex = assertThrows(NegocioException.class, () -> Bbox.parse(texto));

        assertEquals(Response.Status.BAD_REQUEST, ex.getStatus());
        assertEquals("INVALID_BBOX", ex.getCode());
    }
}
