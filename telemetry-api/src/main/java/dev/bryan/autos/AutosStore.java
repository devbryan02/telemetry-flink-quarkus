package dev.bryan.autos;

import jakarta.enterprise.context.ApplicationScoped;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/** Último estado conocido de cada auto, en memoria (spec §9). */
@ApplicationScoped
class AutosStore {

    private final ConcurrentHashMap<String, Auto> autos = new ConcurrentHashMap<>();
    private final Set<String> sucios = ConcurrentHashMap.newKeySet();

    /**
     * Guarda el auto solo si es nuevo o su {@code ts} es mayor que el almacenado,
     * y lo marca como "sucio" para el próximo lote.
     *
     * @return {@code true} si el estado cambió
     */
    boolean actualizar(Auto nuevo) {
        boolean[] cambio = {false};
        autos.compute(nuevo.carId(), (id, actual) -> {
            if (actual == null || nuevo.ts() > actual.ts()) {
                cambio[0] = true;
                return nuevo;
            }
            return actual;
        });
        if (cambio[0]) {
            sucios.add(nuevo.carId());
        }
        return cambio[0];
    }

    List<Auto> todos() {
        return new ArrayList<>(autos.values());
    }

    List<Auto> enBbox(Bbox bbox) {
        List<Auto> resultado = new ArrayList<>();
        for (Auto auto : autos.values()) {
            if (bbox.contiene(auto)) {
                resultado.add(auto);
            }
        }
        return resultado;
    }

    int tamanio() {
        return autos.size();
    }
}
