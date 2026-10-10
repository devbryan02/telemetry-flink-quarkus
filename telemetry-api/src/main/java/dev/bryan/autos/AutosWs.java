package dev.bryan.autos;

import io.quarkus.websockets.next.OnOpen;
import io.quarkus.websockets.next.WebSocket;
import io.quarkus.websockets.next.WebSocketConnection;
import org.jboss.logging.Logger;

/**
 * Endpoint {@code /ws/autos}: solo emite. Los lotes los envía {@link AutosBroadcaster}
 * (el endpoint es un bean por sesión y no puede llevar el temporizador).
 */
@WebSocket(path = "/ws/autos")
public class AutosWs {

    private static final Logger LOG = Logger.getLogger(AutosWs.class);

    @OnOpen
    void abierto(WebSocketConnection conexion) {
        LOG.debugf("WS abierto %s", conexion.id());
    }
}
