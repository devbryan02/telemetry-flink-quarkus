package dev.bryan.simulacion;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.List;
import org.junit.jupiter.api.Test;

class RutaTest {

    /** ~1 km hacia el norte y luego ~1 km hacia el este, cerca de Lima. */
    private static final Ruta NORTE_ESTE = new Ruta(List.of(
            new double[] {-77.00, -12.00},
            new double[] {-77.00, -11.991},
            new double[] {-76.9908, -11.991}));

    @Test
    void calculaLaLongitudAcumulada() {
        assertEquals(2000, NORTE_ESTE.longitud(), 15);
    }

    @Test
    void ubicaPuntosYRumbosSobreLaPolilinea() {
        Ruta.Punto inicio = NORTE_ESTE.posicionEn(0);
        assertEquals(-12.00, inicio.lat(), 1e-9);
        assertEquals(0, inicio.rumbo(), 0.5);            // hacia el norte

        Ruta.Punto mitadPrimerTramo = NORTE_ESTE.posicionEn(NORTE_ESTE.longitud() / 4);
        assertEquals(-11.9955, mitadPrimerTramo.lat(), 1e-3);
        assertEquals(-77.00, mitadPrimerTramo.lon(), 1e-9);

        Ruta.Punto segundoTramo = NORTE_ESTE.posicionEn(NORTE_ESTE.longitud() * 0.75);
        assertEquals(90, segundoTramo.rumbo(), 0.5);     // hacia el este
    }

    @Test
    void fueraDeRangoSeAjustaALosExtremos() {
        assertEquals(-12.00, NORTE_ESTE.posicionEn(-50).lat(), 1e-9);
        assertEquals(-76.9908, NORTE_ESTE.posicionEn(1e9).lon(), 1e-9);
    }

    @Test
    void necesitaAlMenosDosPuntos() {
        assertThrows(IllegalArgumentException.class, () -> new Ruta(List.of(new double[] {-77, -12})));
    }
}
