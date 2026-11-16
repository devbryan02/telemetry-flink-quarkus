package dev.bryan.domain.model;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Estado público de la carrera. */
public record EstadoSimulacion(EstadoCarrera estado, String ruta, Instant inicio, double longitudM,
                               List<Clasificado> autos, UUID carreraId) {
}
