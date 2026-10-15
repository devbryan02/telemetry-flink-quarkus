package dev.bryan.simulacion;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import dev.bryan.shared.error.ComsatelException;
import io.quarkus.runtime.ShutdownEvent;
import io.smallrye.reactive.messaging.kafka.Record;
import io.vertx.core.Vertx;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import jakarta.ws.rs.core.Response;
import java.time.Instant;
import java.time.Clock;
import java.util.UUID;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Set;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.eclipse.microprofile.reactive.messaging.Channel;
import org.eclipse.microprofile.reactive.messaging.Emitter;
import org.jboss.logging.Logger;

/**
 * Carrera: los autos del escenario salen juntos del inicio de la ruta elegida y avanzan cada
 * `intervalo` hasta la meta, publicando su posición en {@code telemetria} (key = carId).
 * Se controla desde {@link SimulacionResource}.
 */
@ApplicationScoped
class Simulador {

    private static final Logger LOG = Logger.getLogger(Simulador.class);

    enum EstadoCarrera { LISTA, EN_CURSO, TERMINADA }

    /** Un auto en la clasificación. `llegadaMs` es el tiempo de carrera al cruzar la meta. */
    record Clasificado(int posicion, String carId, String companyId, String fleetId, double velocidadKmh,
                       double recorridoM, Long llegadaMs, UUID viajeId) {
    }

    /** Estado público de la carrera. */
    record Estado(EstadoCarrera estado, String ruta, Instant inicio, double longitudM, List<Clasificado> autos, UUID carreraId) {
    }

    @Inject
    CatalogoRutas catalogo;

    @Inject
    PublicadorTelemetria publicador;

    @Inject
    Vertx vertx;


    @ConfigProperty(name = "simulacion.escenario", defaultValue = "carrera")
    String nombreEscenario;

    @ConfigProperty(name = "simulacion.intervalo-ms", defaultValue = "1000")
    long intervaloMs;

    private EstadoCarrera estado = EstadoCarrera.LISTA;
    private long temporizador = -1;
    private String ruta;
    private double longitudM;
    private Instant inicio;
    private UUID carreraId;
    private final RelojEventos reloj=new RelojEventos(Clock.systemUTC());
    private final Map<String,Long> inicios=new HashMap<>();
    private final Set<String> cerrados=new HashSet<>();
    private long tiempoCarreraMs;
    private List<AutoCorredor> autos = List.of();
    /** Velocidad elegida por auto; se conserva entre carreras. */
    private final Map<String, Double> velocidades = new LinkedHashMap<>();

    synchronized Estado estado() {
        List<AutoCorredor> orden = autos.stream().sorted(ordenDeCarrera()).toList();
        List<Clasificado> clasificacion = new java.util.ArrayList<>();
        for (int i = 0; i < orden.size(); i++) {
            AutoCorredor a = orden.get(i);
            clasificacion.add(new Clasificado(i + 1, a.carId(), a.companyId(), a.fleetId(), a.velocidadKmh(),
                    Math.round(a.recorrido() * 10) / 10.0, a.llegadaMs(), a.viajeId()));
        }
        if (clasificacion.isEmpty()) {   // antes de la primera carrera: los autos del escenario en la salida
            int i = 0;
            for (Escenario.AutoInicial a : escenario().autos()) {
                clasificacion.add(new Clasificado(++i, a.carId(), a.companyId(), a.fleetId(),
                        velocidades.getOrDefault(a.carId(), a.velocidadKmh()), 0, null, null));
            }
        }
        return new Estado(estado, ruta, inicio, Math.round(longitudM * 10) / 10.0, clasificacion, carreraId);
    }

    /** Nueva carrera en la ruta indicada: todos salen del inicio. Si había una en curso, la reemplaza. */
    synchronized Estado iniciar(String idRuta) {
        Ruta trazado = catalogo.ruta(idRuta);   // 404 si no existe
        cerrarAbiertos("REEMPLAZADO");
        cancelarTemporizador();
        ruta = idRuta;
        longitudM = trazado.longitud();
        autos = escenario().autos().stream()
                .map(a -> new AutoCorredor(a, trazado, velocidades.getOrDefault(a.carId(), a.velocidadKmh())))
                .toList();
        inicio = Instant.now();
        carreraId=UUID.randomUUID();
        inicios.clear();cerrados.clear();
        tiempoCarreraMs = 0;
        estado = EstadoCarrera.EN_CURSO;
        for(var auto:autos){
            long ts=reloj.siguiente(auto.carId());inicios.put(auto.carId(),ts);
            publicar(auto,"INICIO",null,ts);
        }
        temporizador = vertx.setPeriodic(intervaloMs, id -> avanzar());
        LOG.infof("Carrera iniciada en %s (%.1f km) con %d autos", idRuta, longitudM / 1000, autos.size());
        return estado();
    }

    /** Detiene la carrera; los autos quedan donde están. */
    synchronized Estado detener() {
        if (estado == EstadoCarrera.EN_CURSO) {
            cerrarAbiertos("DETENIDO");
            cancelarTemporizador();
            estado = EstadoCarrera.LISTA;
            LOG.info("Carrera detenida");
        }
        return estado();
    }

    /** Cambia la velocidad de un auto, también en plena carrera. */
    synchronized Estado velocidad(String carId, double kmh) {
        if (!AutoCorredor.velocidadValida(kmh)) {
            throw new ComsatelException(Response.Status.BAD_REQUEST, "VELOCIDAD_INVALIDA",
                    "La velocidad debe estar entre " + (int) AutoCorredor.VELOCIDAD_MINIMA_KMH + " y "
                            + (int) AutoCorredor.VELOCIDAD_MAXIMA_KMH + " km/h");
        }
        boolean existe = escenario().autos().stream().anyMatch(a -> a.carId().equals(carId));
        if (!existe) {
            throw new ComsatelException(Response.Status.NOT_FOUND, "AUTO_NO_ENCONTRADO", "No existe el auto " + carId);
        }
        velocidades.put(carId, kmh);
        autos.stream().filter(a -> a.carId().equals(carId)).forEach(a -> a.velocidad(kmh));
        return estado();
    }

    void alApagar(@Observes ShutdownEvent ev) {
        detener();
        try{publicador.pendientes().toCompletableFuture().get(5,java.util.concurrent.TimeUnit.SECONDS);}
        catch(Exception ex){LOG.warn("No se confirmaron todas las publicaciones al apagar");}
    }

    synchronized void avanzar() {
        if(estado!=EstadoCarrera.EN_CURSO)return;
        tiempoCarreraMs += intervaloMs;
        List<AutoCorredor> enPista = autos.stream().filter(a -> !a.llego()).toList();
        for (AutoCorredor auto : enPista) {
            auto.avanzar(intervaloMs / 1000.0, tiempoCarreraMs);
        }
        for(var auto:enPista)publicar(auto,auto.llego()?"FIN":"POSICION",auto.llego()?"META":null,reloj.siguiente(auto.carId()));
        if (autos.stream().allMatch(AutoCorredor::llego)) {
            cancelarTemporizador();
            estado = EstadoCarrera.TERMINADA;
            LOG.infof("Carrera terminada en %s", ruta);
        }
    }

    private void cerrarAbiertos(String motivo){
        for(var auto:autos)if(!cerrados.contains(auto.carId()))
            publicar(auto,"FIN",motivo,reloj.siguiente(auto.carId()));
    }
    private void publicar(AutoCorredor auto,String tipo,String motivo,long ts){
        var p=auto.evento(ts);
        var evento=new TelemetriaEvento(p.carId(),p.companyId(),p.fleetId(),p.lat(),p.lon(),p.heading(),
            p.engine(),p.battery(),ts,2,UUID.randomUUID(),carreraId,auto.viajeId(),ruta,
            inicios.get(auto.carId()),tipo,motivo);
        if("FIN".equals(tipo))cerrados.add(auto.carId());
        publicador.publicar(evento);
    }

    private void cancelarTemporizador() {
        if (temporizador >= 0) {
            vertx.cancelTimer(temporizador);
            temporizador = -1;
        }
    }

    private Escenario escenario() {
        return catalogo.escenario(nombreEscenario);
    }

    /** Primero los que llegaron (por tiempo), después los que corren (por distancia recorrida). */
    private static Comparator<AutoCorredor> ordenDeCarrera() {
        return Comparator.comparing((AutoCorredor a) -> !a.llego())
                .thenComparing(a -> a.llego() ? a.llegadaMs() : 0L)
                .thenComparing(AutoCorredor::recorrido, Comparator.reverseOrder())
                .thenComparing(AutoCorredor::carId);
    }
}
