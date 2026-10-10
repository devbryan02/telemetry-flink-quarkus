package dev.bryan.simulacion;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.runtime.ShutdownEvent;
import io.smallrye.reactive.messaging.kafka.Record;
import io.vertx.core.Vertx;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import java.time.Instant;
import java.util.List;
import java.util.Random;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.eclipse.microprofile.reactive.messaging.Channel;
import org.eclipse.microprofile.reactive.messaging.Emitter;
import org.jboss.logging.Logger;

/**
 * Ejecuta el escenario: cada `intervalo` avanza los autos por su ruta y publica su posición en
 * {@code telemetria} (key = carId). Arranca detenida; se controla desde {@link SimulacionResource}.
 */
@ApplicationScoped
class Simulador {

    private static final Logger LOG = Logger.getLogger(Simulador.class);

    /** Estado público de la simulación. */
    record Estado(boolean enCurso, String escenario, int autos, Instant desde) {
    }

    @Inject
    CatalogoRutas catalogo;

    @Inject
    ObjectMapper mapper;

    @Inject
    Vertx vertx;

    @Inject
    @Channel("telemetria-out")
    Emitter<Record<String, String>> telemetria;

    @ConfigProperty(name = "simulacion.escenario", defaultValue = "av-brasil")
    String nombreEscenario;

    @ConfigProperty(name = "simulacion.intervalo-ms", defaultValue = "1000")
    long intervaloMs;

    private long temporizador = -1;
    private List<AutoSimulado> autos = List.of();
    private Instant desde;

    synchronized Estado estado() {
        return new Estado(temporizador >= 0, nombreEscenario, autos.size(), desde);
    }

    /** Inicia la simulación desde las posiciones del escenario. Si ya está en curso, no hace nada. */
    synchronized Estado iniciar() {
        if (temporizador >= 0) {
            return estado();
        }
        Escenario escenario = catalogo.escenario(nombreEscenario);
        CatalogoRutas.Calzadas calzadas = catalogo.calzadas(escenario.ruta());
        Random azar = new Random();
        autos = escenario.autos().stream()
                .map(a -> new AutoSimulado(a, calzadas.ida(), calzadas.vuelta(), AutoSimulado.Comportamiento.POR_DEFECTO, azar))
                .toList();
        desde = Instant.now();
        publicar();   // posición inicial inmediata, sin esperar al primer intervalo
        temporizador = vertx.setPeriodic(intervaloMs, id -> avanzar());
        LOG.infof("Simulación '%s' iniciada con %d autos", escenario.nombre(), autos.size());
        return estado();
    }

    /** Detiene la simulación. Los autos quedan en su última posición. */
    synchronized Estado detener() {
        if (temporizador >= 0) {
            vertx.cancelTimer(temporizador);
            temporizador = -1;
            desde = null;
            LOG.info("Simulación detenida");
        }
        return estado();
    }

    void alApagar(@Observes ShutdownEvent ev) {
        detener();
    }

    private synchronized void avanzar() {
        for (AutoSimulado auto : autos) {
            auto.avanzar(intervaloMs / 1000.0);
        }
        publicar();
    }

    private void publicar() {
        long ahora = System.currentTimeMillis();
        for (AutoSimulado auto : autos) {
            try {
                telemetria.send(Record.of(auto.carId(), mapper.writeValueAsString(auto.evento(ahora))));
            } catch (JsonProcessingException e) {
                LOG.errorf(e, "No se pudo serializar el evento de %s", auto.carId());
            }
        }
    }
}
