package dev.bryan.domain.model;

import java.util.UUID;

/** Un auto en la clasificación. `llegadaMs` es el tiempo de carrera al cruzar la meta. */
public record Clasificado(int posicion, String carId, String companyId, String fleetId, double velocidadKmh,
                          double recorridoM, Long llegadaMs, UUID viajeId) {
}
