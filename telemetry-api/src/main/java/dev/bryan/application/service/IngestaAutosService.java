package dev.bryan.application.service;

import dev.bryan.application.port.in.IngestarUltimasPosiciones;
import dev.bryan.application.port.out.AutosRepositorio;
import dev.bryan.application.port.out.DifusionAutos;
import dev.bryan.application.port.out.MetricasIngesta;
import dev.bryan.domain.model.AutoEvento;
import java.util.List;

/** El commit JDBC ocurre en {@code guardarLote}; solo después los cambios pasan a la difusión. */
public class IngestaAutosService implements IngestarUltimasPosiciones {

    private final AutosRepositorio repositorio;
    private final DifusionAutos difusion;
    private final MetricasIngesta metricas;

    public IngestaAutosService(AutosRepositorio repositorio, DifusionAutos difusion, MetricasIngesta metricas) {
        this.repositorio = repositorio;
        this.difusion = difusion;
        this.metricas = metricas;
    }

    @Override
    public void ingestar(List<AutoEvento> lote) {
        try {
            difusion.registrar(repositorio.guardarLote(lote));
        } catch (RuntimeException ex) {
            metricas.autosFalloPersistencia();
            throw ex;
        }
    }
}
