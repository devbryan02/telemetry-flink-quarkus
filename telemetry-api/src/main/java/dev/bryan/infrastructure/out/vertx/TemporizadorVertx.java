package dev.bryan.infrastructure.out.vertx;

import dev.bryan.application.port.out.Temporizador;
import io.vertx.core.Vertx;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

@ApplicationScoped
class TemporizadorVertx implements Temporizador {
    @Inject Vertx vertx;

    @Override
    public long cadaMs(long periodoMs, Runnable tarea) {
        return vertx.setPeriodic(periodoMs, id -> tarea.run());
    }

    @Override
    public void cancelar(long id) {
        vertx.cancelTimer(id);
    }
}
