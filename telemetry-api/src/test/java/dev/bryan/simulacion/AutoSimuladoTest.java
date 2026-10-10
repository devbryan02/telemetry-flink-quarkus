package dev.bryan.simulacion;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Random;
import org.junit.jupiter.api.Test;

class AutoSimuladoTest {

    /** Calzada de ~1 km hacia el norte y su vuelta hacia el sur. */
    private static final Ruta IDA = new Ruta(List.of(new double[] {-77.0, -12.0}, new double[] {-77.0, -11.991}));
    private static final Ruta VUELTA = new Ruta(List.of(new double[] {-77.0, -11.991}, new double[] {-77.0, -12.0}));

    private static AutoSimulado auto(double inicio, double kmh, AutoSimulado.Comportamiento comportamiento) {
        return new AutoSimulado(new Escenario.AutoInicial("auto-1", "emp-01", "emp-01-f1", inicio, "ida", kmh),
                IDA, VUELTA, comportamiento, new Random(1));
    }

    @Test
    void avanzaSegunSuVelocidad() {
        AutoSimulado a = auto(0, 36, AutoSimulado.Comportamiento.SIN_PARADAS);   // 36 km/h = 10 m/s

        a.avanzar(1);

        assertEquals(10, a.recorrido(), 1e-6);
    }

    @Test
    void alFinalDeLaCalzadaDaMediaVueltaYCambiaDeRumbo() {
        AutoSimulado a = auto(0.99, 36, AutoSimulado.Comportamiento.SIN_PARADAS);
        assertEquals(0, a.evento(1).heading(), 1);          // hacia el norte

        for (int i = 0; i < 5; i++) {
            a.avanzar(1);
        }

        assertFalse(a.enIda());
        assertEquals(180, a.evento(2).heading(), 1);        // vuelve hacia el sur
    }

    @Test
    void elEventoLlevaEmpresaFlotaYPosicionSobreLaRuta() {
        TelemetriaEvento e = auto(0.5, 40, AutoSimulado.Comportamiento.SIN_PARADAS).evento(123);

        assertEquals("auto-1", e.carId());
        assertEquals("emp-01", e.companyId());
        assertEquals("emp-01-f1", e.fleetId());
        assertEquals(-77.0, e.lon(), 1e-9);
        assertEquals(-11.9955, e.lat(), 1e-4);
        assertEquals("ON", e.engine());
        assertEquals(123, e.ts());
    }

    @Test
    void enUnSemaforoPuedeDetenerse() {
        AutoSimulado.Comportamiento siemprePara = new AutoSimulado.Comportamiento(100, 1, 0, 0);
        AutoSimulado a = auto(0, 36, siemprePara);

        for (int i = 0; i < 11; i++) {
            a.avanzar(1);
        }

        assertTrue(a.detenido());
        assertEquals(100, a.recorrido(), 1e-6);              // quieto en el semáforo de los 100 m
    }
}
