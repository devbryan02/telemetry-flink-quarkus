package dev.bryan.infrastructure.config;

import dev.bryan.application.port.out.AutosRepositorio;
import dev.bryan.application.port.out.CatalogoRutas;
import dev.bryan.application.port.out.DifusionAutos;
import dev.bryan.application.port.out.MetricasIngesta;
import dev.bryan.application.port.out.PublicadorTelemetria;
import dev.bryan.application.port.out.Temporizador;
import dev.bryan.application.port.out.ViajesConsultaRepositorio;
import dev.bryan.application.port.out.ViajesRepositorio;
import dev.bryan.application.service.AutosService;
import dev.bryan.application.service.IngestaAutosService;
import dev.bryan.application.service.IngestaViajesService;
import dev.bryan.application.service.RutasService;
import dev.bryan.application.service.SimulacionService;
import dev.bryan.application.service.ViajesService;
import jakarta.enterprise.inject.Produces;
import jakarta.inject.Singleton;
import org.eclipse.microprofile.config.inject.ConfigProperty;

/**
 * Composición: crea los servicios de aplicación (sin anotaciones de CDI) conectándolos con los puertos de salida.
 * Es el único lugar donde el núcleo conoce la configuración de Quarkus.
 */
class ServiciosConfig {

    @Produces
    @Singleton
    SimulacionService simulacion(CatalogoRutas catalogo, PublicadorTelemetria publicador, Temporizador temporizador,
                                 @ConfigProperty(name = "simulacion.escenario", defaultValue = "carrera") String escenario,
                                 @ConfigProperty(name = "simulacion.intervalo-ms", defaultValue = "1000") long intervaloMs) {
        return new SimulacionService(catalogo, publicador, temporizador, escenario, intervaloMs);
    }

    @Produces
    @Singleton
    RutasService rutas(CatalogoRutas catalogo) {
        return new RutasService(catalogo);
    }

    @Produces
    @Singleton
    AutosService autos(AutosRepositorio repositorio) {
        return new AutosService(repositorio);
    }

    @Produces
    @Singleton
    IngestaAutosService ingestaAutos(AutosRepositorio repositorio, DifusionAutos difusion, MetricasIngesta metricas) {
        return new IngestaAutosService(repositorio, difusion, metricas);
    }

    @Produces
    @Singleton
    ViajesService viajes(ViajesConsultaRepositorio repositorio) {
        return new ViajesService(repositorio);
    }

    @Produces
    @Singleton
    IngestaViajesService ingestaViajes(ViajesRepositorio repositorio, MetricasIngesta metricas) {
        return new IngestaViajesService(repositorio, metricas);
    }
}
