package dev.bryan.simulacion;

import java.util.List;

/** Definición de una simulación: la ruta y los autos que la recorren (`resources/escenarios/*.json`). */
record Escenario(String nombre, String ruta, List<AutoInicial> autos) {

    /**
     * @param inicio       fracción de la calzada (0 a 1) donde arranca el auto
     * @param sentido      calzada inicial: {@code ida} o {@code vuelta}
     * @param velocidadKmh velocidad de crucero
     */
    record AutoInicial(String carId, String companyId, String fleetId, double inicio, String sentido,
                       double velocidadKmh) {
    }
}
