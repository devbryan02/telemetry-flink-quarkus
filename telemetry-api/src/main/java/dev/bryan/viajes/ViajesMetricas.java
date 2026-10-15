package dev.bryan.viajes;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import jakarta.enterprise.context.ApplicationScoped;
/** Contadores de ingesta sin etiquetas por auto ni viaje; SIN_CIERRE se consulta solo al leer las métricas. */
@ApplicationScoped
class ViajesMetricas {
    @Inject MeterRegistry registry;
    @Inject ViajesStore store;
    void iniciar(@Observes StartupEvent ev){
        Gauge.builder("viajes.sin_cierre",store,s->{
            try{return s.sinCierre();}catch(RuntimeException ex){return Double.NaN;}
        }).description("Viajes sin cierre explicito; no implica por si solo un fallo").register(registry);
    }
    void registrar(ResultadoIngesta r){
        registry.counter("viajes.eventos.insertados").increment(r.insertados());
        registry.counter("viajes.eventos.duplicados").increment(r.duplicados());
        registry.counter("viajes.eventos.legados").increment(r.legados());
    }
    void invalido(){registry.counter("viajes.eventos.invalidos").increment();}
    void falloPersistencia(){registry.counter("viajes.persistencia.fallos").increment();}
}
