package dev.bryan.flink;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.ArrayList;
import java.util.List;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.util.CloseableIterator;
import org.junit.jupiter.api.Test;

/** Ejecuta la lógica del job en un MiniCluster local con datos en memoria (sin Kafka). */
class UltimaPosicionJobTest {

    private static Posicion p(String id, long ts) {
        return new Posicion(id, null, null, -12.0, -77.0, 0, "ON", 80, ts);
    }

    private static List<Posicion> ejecutar(Posicion... eventos) throws Exception {
        StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
        env.setParallelism(1);
        List<Posicion> salida = new ArrayList<>();
        try (CloseableIterator<Posicion> it =
                     UltimaPosicionJob.ultimaPosicion(env.fromData(eventos)).executeAndCollect()) {
            it.forEachRemaining(salida::add);
        }
        return salida;
    }

    @Test
    void descartaEventosViejosYEmiteSoloLosMasNuevos() throws Exception {
        List<Posicion> salida = ejecutar(p("a", 100), p("a", 50), p("a", 200), p("b", 10), p("a", 200));

        assertEquals(List.of(p("a", 100), p("a", 200), p("b", 10)), salida);
    }

    @Test
    void unEventoAntiguoNoReemplazaAUnoMasReciente() throws Exception {
        List<Posicion> salida = ejecutar(p("a", 1000), p("a", 1));

        assertEquals(List.of(p("a", 1000)), salida);
    }

    @Test
    void conservaEmpresaFlotaYRumbo() throws Exception {
        Posicion conEmpresa = new Posicion("a", "emp-01", "emp-01-f3", -12.0, -77.0, 270, "ON", 80, 5);

        assertEquals(List.of(conEmpresa), ejecutar(conEmpresa));
    }
}
