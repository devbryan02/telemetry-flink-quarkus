package dev.bryan.infrastructure.config;

import dev.bryan.application.port.in.GestionarSimulacion;
import io.quarkus.runtime.ShutdownEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;

/** Al apagar, cierra los viajes abiertos y espera las publicaciones pendientes. */
@ApplicationScoped
class ApagadoSimulacion {
    @Inject GestionarSimulacion simulacion;

    void alApagar(@Observes ShutdownEvent ev) {
        simulacion.apagar();
    }
}
