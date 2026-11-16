package dev.bryan.application.port.out;

import dev.bryan.domain.model.Auto;
import java.util.List;

/** Cambios confirmados que deben llegar a los clientes en tiempo real (hoy, por WebSocket). */
public interface DifusionAutos {
    void registrar(List<Auto> cambios);
}
