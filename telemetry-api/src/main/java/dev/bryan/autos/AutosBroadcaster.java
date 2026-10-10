package dev.bryan.autos;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.runtime.ShutdownEvent;
import io.quarkus.runtime.StartupEvent;
import io.quarkus.websockets.next.OpenConnections;
import io.quarkus.websockets.next.WebSocketConnection;
import io.vertx.core.Vertx;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import java.util.List;
import org.jboss.logging.Logger;

/**
 * Cada 500 ms envía un único mensaje con el arreglo de autos que cambiaron (spec §9, RF-Q3).
 * Usa un temporizador de Vert.x porque {@code @Scheduled} solo evalúa sus triggers una vez por segundo.
 */
@ApplicationScoped
class AutosBroadcaster {

    static final long PERIODO_MS = 500;

    private static final Logger LOG = Logger.getLogger(AutosBroadcaster.class);

    @Inject
    AutosStore store;

    @Inject
    OpenConnections conexiones;

    @Inject
    ObjectMapper mapper;

    @Inject
    Vertx vertx;

    private long temporizador = -1;

    void iniciar(@Observes StartupEvent ev) {
        temporizador = vertx.setPeriodic(PERIODO_MS, id -> emitir());
    }

    void detener(@Observes ShutdownEvent ev) {
        vertx.cancelTimer(temporizador);
    }

    void emitir() {
        try {
            List<Auto> lote = store.drenarSucios();
            if (lote.isEmpty() || conexiones.listAll().isEmpty()) {
                return;
            }
            String json = mapper.writeValueAsString(lote);
            for (WebSocketConnection conexion : conexiones.listAll()) {
                conexion.sendText(json).subscribe().with(
                        ok -> { },
                        error -> LOG.debugf("No se pudo enviar el lote a %s: %s", conexion.id(), error.getMessage()));
            }
        } catch (Exception e) {
            LOG.error("Error al emitir el lote", e);
        }
    }
}
