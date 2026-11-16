package dev.bryan.domain.model;

import java.util.List;

/** Los autos que corren (`resources/escenarios/*.json`). La ruta se elige al iniciar la carrera. */
public record Escenario(String nombre, List<AutoInicial> autos) {

    /** @param velocidadKmh velocidad con la que arranca el auto (ajustable después desde la web) */
    public record AutoInicial(String carId, String companyId, String fleetId, double velocidadKmh) {
    }
}
