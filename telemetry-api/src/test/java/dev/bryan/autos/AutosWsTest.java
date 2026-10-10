package dev.bryan.autos;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.test.common.QuarkusTestResource;
import io.quarkus.test.common.http.TestHTTPResource;
import io.quarkus.test.junit.QuarkusTest;
import io.smallrye.reactive.messaging.memory.InMemoryConnector;
import io.smallrye.reactive.messaging.memory.InMemorySource;
import jakarta.enterprise.inject.Any;
import jakarta.inject.Inject;
import java.util.List;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.WebSocket;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.LinkedBlockingDeque;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;

@QuarkusTest
@QuarkusTestResource(InMemoryKafkaResource.class)
class AutosWsTest {

    @TestHTTPResource("/ws/autos")
    URI uri;

    @Inject
    @Any
    InMemoryConnector connector;

    @Inject
    ObjectMapper mapper;

    private final LinkedBlockingDeque<String> mensajes = new LinkedBlockingDeque<>();

    private WebSocket conectar() throws Exception {
        URI ws = URI.create(uri.toString().replaceFirst("^http", "ws"));
        return HttpClient.newHttpClient().newWebSocketBuilder().buildAsync(ws, new WebSocket.Listener() {
            private final StringBuilder parcial = new StringBuilder();

            @Override
            public CompletionStage<?> onText(WebSocket webSocket, CharSequence data, boolean last) {
                parcial.append(data);
                if (last) {
                    mensajes.add(parcial.toString());
                    parcial.setLength(0);
                }
                webSocket.request(1);
                return null;
            }
        }).get(5, TimeUnit.SECONDS);
    }

    private void publicar(Auto auto) {
        InMemorySource<List<Auto>> fuente = connector.source("ultima-posicion");
        fuente.send(List.of(auto));  // el canal consume por lotes
    }

    @Test
    void recibeLotesConUnSoloRegistroPorAutoYSinMensajesSiNoHayCambios() throws Exception {
        WebSocket ws = conectar();
        try {
            // vaciar lo que hayan dejado otras pruebas
            while (mensajes.poll(1100, TimeUnit.MILLISECONDS) != null) {
                // descartar
            }

            publicar(new Auto("ws-1", null, null, -12.0, -77.0, 0, "ON", 90, 1000));
            publicar(new Auto("ws-1", null, null, -12.1, -77.1, 0, "OFF", 89, 2000));
            publicar(new Auto("ws-2", null, null, -12.2, -77.2, 0, "ON", 70, 1500));

            long ultimoTsWs1 = 0;
            boolean vistoWs2 = false;
            long limite = System.currentTimeMillis() + 3000;
            while (System.currentTimeMillis() < limite && !(vistoWs2 && ultimoTsWs1 == 2000)) {
                String mensaje = mensajes.poll(600, TimeUnit.MILLISECONDS);
                if (mensaje == null) {
                    continue;
                }
                JsonNode lote = mapper.readTree(mensaje);
                assertTrue(lote.isArray());
                int ws1EnEsteLote = 0;
                for (JsonNode auto : lote) {
                    String id = auto.get("carId").asText();
                    if (id.equals("ws-1")) {
                        ws1EnEsteLote++;
                        ultimoTsWs1 = auto.get("ts").asLong();
                    }
                    vistoWs2 |= id.equals("ws-2");
                }
                assertTrue(ws1EnEsteLote <= 1, "un auto aparece una sola vez por lote");
            }
            assertEquals(2000, ultimoTsWs1);
            assertTrue(vistoWs2);

            // sin cambios nuevos no llegan más mensajes
            while (mensajes.poll(1100, TimeUnit.MILLISECONDS) != null) {
                // lote en vuelo
            }
            assertNull(mensajes.poll(1200, TimeUnit.MILLISECONDS));
        } finally {
            ws.sendClose(WebSocket.NORMAL_CLOSURE, "fin").get(2, TimeUnit.SECONDS);
        }
    }
}
