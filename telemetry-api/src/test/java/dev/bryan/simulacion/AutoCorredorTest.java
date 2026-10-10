package dev.bryan.simulacion;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import org.junit.jupiter.api.Test;

class AutoCorredorTest {

    /** Ruta de ~1 km hacia el norte. */
    private static final Ruta RUTA = new Ruta(List.of(new double[] {-77.0, -12.0}, new double[] {-77.0, -11.991}));

    private static AutoCorredor auto(double kmh) {
        return new AutoCorredor(new Escenario.AutoInicial("auto-1", "emp-01", "emp-01-f1", kmh), RUTA, kmh);
    }

    @Test
    void saleDeLaSalidaYAvanzaSegunSuVelocidad() {
        AutoCorredor a = auto(36);   // 10 m/s
        assertEquals(0, a.recorrido());
        assertEquals(-12.0, a.evento(1).lat(), 1e-9);

        a.avanzar(1, 1000);

        assertEquals(10, a.recorrido(), 1e-6);
        assertEquals("ON", a.evento(1).engine());
        assertEquals(0, a.evento(1).heading());
    }

    @Test
    void alLlegarALaMetaSeDetieneConMotorApagadoYRegistraSuTiempo() {
        AutoCorredor a = auto(360);   // 100 m/s: ~1.000 m en ~10 s
        long t = 0;
        while (!a.llego() && t < 60_000) {
            t += 1000;
            a.avanzar(1, t);
        }

        assertTrue(a.llego());
        assertEquals(RUTA.longitud(), a.recorrido(), 1e-6);
        assertEquals("OFF", a.evento(1).engine());
        assertEquals(RUTA.longitud() / 100 * 1000, a.llegadaMs(), 1.0);   // instante exacto interpolado

        double antes = a.recorrido();
        a.avanzar(1, t + 1000);
        assertEquals(antes, a.recorrido(), "ya no avanza");
    }

    @Test
    void elCambioDeVelocidadAplicaDesdeElSiguientePaso() {
        AutoCorredor a = auto(36);
        a.avanzar(1, 1000);

        a.velocidad(72);   // 20 m/s
        a.avanzar(1, 2000);

        assertEquals(30, a.recorrido(), 1e-6);
        assertFalse(a.llego());
        assertNull(a.llegadaMs());
    }

    @Test
    void rechazaVelocidadesFueraDeRango() {
        AutoCorredor a = auto(60);

        assertThrows(IllegalArgumentException.class, () -> a.velocidad(5));
        assertThrows(IllegalArgumentException.class, () -> a.velocidad(501));
        assertTrue(AutoCorredor.velocidadValida(10));
        assertTrue(AutoCorredor.velocidadValida(500));
    }
}
