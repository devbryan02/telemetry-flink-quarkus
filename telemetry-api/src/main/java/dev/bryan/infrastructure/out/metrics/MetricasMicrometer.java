package dev.bryan.infrastructure.out.metrics;

import dev.bryan.application.port.out.MetricasIngesta;
import dev.bryan.domain.model.ResultadoIngesta;
import dev.bryan.infrastructure.out.jdbc.viajes.ViajesStore;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;

/** Contadores de ingesta sin etiquetas por auto ni viaje; SIN_CIERRE se consulta solo al leer las métricas. */
@ApplicationScoped
class MetricasMicrometer implements MetricasIngesta {
    @Inject MeterRegistry registry;
    @Inject ViajesStore store;

    void iniciar(@Observes StartupEvent ev) {
        Gauge.builder("viajes.sin_cierre", store, s -> {
            try {
                return s.sinCierre();
            } catch (RuntimeException ex) {
                return Double.NaN;
            }
        }).description("Viajes sin cierre explicito; no implica por si solo un fallo").register(registry);
    }

    @Override
    public void viajesIngestados(ResultadoIngesta r) {
        registry.counter("viajes.eventos.insertados").increment(r.insertados());
        registry.counter("viajes.eventos.duplicados").increment(r.duplicados());
        registry.counter("viajes.eventos.legados").increment(r.legados());
    }

    @Override
    public void viajeInvalido() {
        registry.counter("viajes.eventos.invalidos").increment();
    }

    @Override
    public void viajesFalloPersistencia() {
        registry.counter("viajes.persistencia.fallos").increment();
    }

    @Override
    public void autosFalloPersistencia() {
        registry.counter("autos.persistencia.fallos").increment();
    }
}
