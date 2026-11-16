package dev.bryan.application.service;

import dev.bryan.application.port.in.IngestarHistorialViajes;
import dev.bryan.application.port.out.MetricasIngesta;
import dev.bryan.application.port.out.ViajesRepositorio;
import dev.bryan.domain.model.EventoViaje;
import dev.bryan.domain.model.ResultadoIngesta;
import java.util.List;

/** La transacción termina dentro del repositorio, antes de que el consumidor confirme el offset. */
public class IngestaViajesService implements IngestarHistorialViajes {

    private static final System.Logger LOG = System.getLogger(IngestaViajesService.class.getName());

    private final ViajesRepositorio repositorio;
    private final MetricasIngesta metricas;

    public IngestaViajesService(ViajesRepositorio repositorio, MetricasIngesta metricas) {
        this.repositorio = repositorio;
        this.metricas = metricas;
    }

    @Override
    public ResultadoIngesta ingestar(List<EventoViaje> eventos) {
        try {
            var resultado = repositorio.guardarLote(eventos);
            metricas.viajesIngestados(resultado);
            if (resultado.legados() > 0) {
                LOG.log(System.Logger.Level.INFO, "Eventos legados excluidos del historial: {0}", resultado.legados());
            }
            return resultado;
        } catch (IllegalArgumentException ex) {
            metricas.viajeInvalido();
            throw ex;
        } catch (RuntimeException ex) {
            metricas.viajesFalloPersistencia();
            throw ex;
        }
    }
}
