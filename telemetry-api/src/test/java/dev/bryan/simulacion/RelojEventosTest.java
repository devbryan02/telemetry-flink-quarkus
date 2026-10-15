package dev.bryan.simulacion;
import static org.junit.jupiter.api.Assertions.*;
import java.time.*;
import org.junit.jupiter.api.Test;
class RelojEventosTest {
    @Test void relojFijoProduceTimestampsCrecientesPorAuto() {
        var reloj=new RelojEventos(Clock.fixed(Instant.ofEpochMilli(1000),ZoneOffset.UTC));
        assertEquals(1000,reloj.siguiente("a"));
        assertEquals(1001,reloj.siguiente("a"));
        assertEquals(1000,reloj.siguiente("b"));
    }
}
