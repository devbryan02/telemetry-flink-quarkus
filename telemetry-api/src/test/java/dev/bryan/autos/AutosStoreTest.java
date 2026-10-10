package dev.bryan.autos;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import org.junit.jupiter.api.Test;

class AutosStoreTest {

    private static Auto auto(String id, long ts) {
        return new Auto(id, -12.0, -77.0, "ON", 80, ts);
    }

    @Test
    void autoNuevoSeGuarda() {
        AutosStore store = new AutosStore();

        assertTrue(store.actualizar(auto("auto-1", 100)));
        assertEquals(1, store.tamanio());
    }

    @Test
    void eventoMasNuevoReemplazaAlAnterior() {
        AutosStore store = new AutosStore();
        store.actualizar(auto("auto-1", 100));

        assertTrue(store.actualizar(auto("auto-1", 200)));

        assertEquals(1, store.tamanio());
        assertEquals(200, store.todos().get(0).ts());
    }

    @Test
    void eventoViejoOIgualNoReemplaza() {
        AutosStore store = new AutosStore();
        store.actualizar(auto("auto-1", 200));

        assertFalse(store.actualizar(auto("auto-1", 100)));
        assertFalse(store.actualizar(auto("auto-1", 200)));

        assertEquals(200, store.todos().get(0).ts());
    }

    @Test
    void drenarEntregaCadaAutoUnaVezAunqueSeActualiceVariasVeces() {
        AutosStore store = new AutosStore();
        store.actualizar(auto("auto-1", 100));
        store.actualizar(auto("auto-1", 200));
        store.actualizar(auto("auto-1", 300));
        store.actualizar(auto("auto-2", 100));

        List<Auto> lote = store.drenarSucios();

        assertEquals(2, lote.size());
        assertEquals(300, lote.stream().filter(a -> a.carId().equals("auto-1")).findFirst().orElseThrow().ts());
        assertTrue(store.drenarSucios().isEmpty());
    }

    @Test
    void eventoViejoNoMarcaSucio() {
        AutosStore store = new AutosStore();
        store.actualizar(auto("auto-1", 200));
        store.drenarSucios();

        store.actualizar(auto("auto-1", 100));

        assertTrue(store.drenarSucios().isEmpty());
    }

    @Test
    void actualizacionPosteriorAlDrenadoEntraEnElSiguienteLote() {
        AutosStore store = new AutosStore();
        store.actualizar(auto("auto-1", 100));
        store.drenarSucios();

        store.actualizar(auto("auto-1", 200));

        assertEquals(1, store.drenarSucios().size());
    }

    @Test
    void guardaUnRegistroPorAuto() {
        AutosStore store = new AutosStore();
        for (int i = 0; i < 1000; i++) {
            store.actualizar(auto("auto-" + (i % 10), i));
        }

        assertEquals(10, store.tamanio());
    }
}
