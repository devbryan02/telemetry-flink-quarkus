package dev.bryan.application.service;

import dev.bryan.application.port.in.GestionarSimulacion;
import dev.bryan.application.port.out.CatalogoRutas;
import dev.bryan.application.port.out.PublicadorTelemetria;
import dev.bryan.application.port.out.Temporizador;
import dev.bryan.domain.exception.NegocioException;
import dev.bryan.domain.model.Clasificado;
import dev.bryan.domain.model.Escenario;
import dev.bryan.domain.model.EstadoCarrera;
import dev.bryan.domain.model.EstadoSimulacion;
import dev.bryan.domain.model.Ruta;
import dev.bryan.domain.model.TelemetriaEvento;
import dev.bryan.domain.service.AutoCorredor;
import dev.bryan.domain.service.RelojEventos;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

/**
 * Carrera: los autos del escenario salen juntos del inicio de la ruta elegida y avanzan cada
 * `intervalo` hasta la meta, publicando su posición en {@code telemetria} (key = carId).
 */
public class SimulacionService implements GestionarSimulacion {

    private static final System.Logger LOG = System.getLogger(SimulacionService.class.getName());

    private final CatalogoRutas catalogo;
    private final PublicadorTelemetria publicador;
    private final Temporizador temporizadorPuerto;
    private final String nombreEscenario;
    private final long intervaloMs;

    private EstadoCarrera estado = EstadoCarrera.LISTA;
    private long temporizador = -1;
    private String ruta;
    private double longitudM;
    private Instant inicio;
    private UUID carreraId;
    private final RelojEventos reloj = new RelojEventos(Clock.systemUTC());
    private final Map<String, Long> inicios = new HashMap<>();
    private final Set<String> cerrados = new HashSet<>();
    private long tiempoCarreraMs;
    private List<AutoCorredor> autos = List.of();
    /** Velocidad elegida por auto; se conserva entre carreras. */
    private final Map<String, Double> velocidades = new LinkedHashMap<>();

    public SimulacionService(CatalogoRutas catalogo, PublicadorTelemetria publicador, Temporizador temporizador,
                             String nombreEscenario, long intervaloMs) {
        this.catalogo = catalogo;
        this.publicador = publicador;
        this.temporizadorPuerto = temporizador;
        this.nombreEscenario = nombreEscenario;
        this.intervaloMs = intervaloMs;
    }

    @Override
    public synchronized EstadoSimulacion estado() {
        List<AutoCorredor> orden = autos.stream().sorted(ordenDeCarrera()).toList();
        List<Clasificado> clasificacion = new ArrayList<>();
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
        return new EstadoSimulacion(estado, ruta, inicio, Math.round(longitudM * 10) / 10.0, clasificacion, carreraId);
    }

    @Override
    public synchronized EstadoSimulacion iniciar(String idRuta) {
        Ruta trazado = catalogo.ruta(idRuta);   // 404 si no existe
        cerrarAbiertos("REEMPLAZADO");
        cancelarTemporizador();
        ruta = idRuta;
        longitudM = trazado.longitud();
        autos = escenario().autos().stream()
                .map(a -> new AutoCorredor(a, trazado, velocidades.getOrDefault(a.carId(), a.velocidadKmh())))
                .toList();
        inicio = Instant.now();
        carreraId = UUID.randomUUID();
        inicios.clear();
        cerrados.clear();
        tiempoCarreraMs = 0;
        estado = EstadoCarrera.EN_CURSO;
        for (var auto : autos) {
            long ts = reloj.siguiente(auto.carId());
            inicios.put(auto.carId(), ts);
            publicar(auto, "INICIO", null, ts);
        }
        temporizador = temporizadorPuerto.cadaMs(intervaloMs, this::avanzar);
        LOG.log(System.Logger.Level.INFO, "Carrera iniciada en {0} ({1} km) con {2} autos",
                idRuta, String.format("%.1f", longitudM / 1000), autos.size());
        return estado();
    }

    @Override
    public synchronized EstadoSimulacion detener() {
        if (estado == EstadoCarrera.EN_CURSO) {
            cerrarAbiertos("DETENIDO");
            cancelarTemporizador();
            estado = EstadoCarrera.LISTA;
            LOG.log(System.Logger.Level.INFO, "Carrera detenida");
        }
        return estado();
    }

    @Override
    public synchronized EstadoSimulacion velocidad(String carId, double kmh) {
        if (!AutoCorredor.velocidadValida(kmh)) {
            throw new NegocioException(NegocioException.Tipo.SOLICITUD_INVALIDA, "VELOCIDAD_INVALIDA",
                    "La velocidad debe estar entre " + (int) AutoCorredor.VELOCIDAD_MINIMA_KMH + " y "
                            + (int) AutoCorredor.VELOCIDAD_MAXIMA_KMH + " km/h");
        }
        boolean existe = escenario().autos().stream().anyMatch(a -> a.carId().equals(carId));
        if (!existe) {
            throw new NegocioException(NegocioException.Tipo.NO_ENCONTRADO, "AUTO_NO_ENCONTRADO",
                    "No existe el auto " + carId);
        }
        velocidades.put(carId, kmh);
        autos.stream().filter(a -> a.carId().equals(carId)).forEach(a -> a.velocidad(kmh));
        return estado();
    }

    @Override
    public void apagar() {
        detener();
        try {
            publicador.pendientes().toCompletableFuture().get(5, TimeUnit.SECONDS);
        } catch (Exception ex) {
            LOG.log(System.Logger.Level.WARNING, "No se confirmaron todas las publicaciones al apagar");
        }
    }

    /** Un paso de la carrera; lo invoca el temporizador. Público para poder avanzar a mano en las pruebas. */
    public synchronized void avanzar() {
        if (estado != EstadoCarrera.EN_CURSO) {
            return;
        }
        tiempoCarreraMs += intervaloMs;
        List<AutoCorredor> enPista = autos.stream().filter(a -> !a.llego()).toList();
        for (AutoCorredor auto : enPista) {
            auto.avanzar(intervaloMs / 1000.0, tiempoCarreraMs);
        }
        for (var auto : enPista) {
            publicar(auto, auto.llego() ? "FIN" : "POSICION", auto.llego() ? "META" : null,
                    reloj.siguiente(auto.carId()));
        }
        if (autos.stream().allMatch(AutoCorredor::llego)) {
            cancelarTemporizador();
            estado = EstadoCarrera.TERMINADA;
            LOG.log(System.Logger.Level.INFO, "Carrera terminada en {0}", ruta);
        }
    }

    private void cerrarAbiertos(String motivo) {
        for (var auto : autos) {
            if (!cerrados.contains(auto.carId())) {
                publicar(auto, "FIN", motivo, reloj.siguiente(auto.carId()));
            }
        }
    }

    private void publicar(AutoCorredor auto, String tipo, String motivo, long ts) {
        var p = auto.evento(ts);
        var evento = new TelemetriaEvento(p.carId(), p.companyId(), p.fleetId(), p.lat(), p.lon(), p.heading(),
                p.engine(), p.battery(), ts, 2, UUID.randomUUID(), carreraId, auto.viajeId(), ruta,
                inicios.get(auto.carId()), tipo, motivo);
        if ("FIN".equals(tipo)) {
            cerrados.add(auto.carId());
        }
        publicador.publicar(evento);
    }

    private void cancelarTemporizador() {
        if (temporizador >= 0) {
            temporizadorPuerto.cancelar(temporizador);
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
