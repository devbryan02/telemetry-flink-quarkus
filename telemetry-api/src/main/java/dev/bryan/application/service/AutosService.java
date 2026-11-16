package dev.bryan.application.service;

import dev.bryan.application.port.in.ConsultarAutos;
import dev.bryan.application.port.out.AutosRepositorio;
import dev.bryan.domain.model.Auto;
import dev.bryan.domain.model.Bbox;
import java.util.List;

public class AutosService implements ConsultarAutos {

    private final AutosRepositorio repositorio;

    public AutosService(AutosRepositorio repositorio) {
        this.repositorio = repositorio;
    }

    @Override
    public List<Auto> todos() {
        return repositorio.todos();
    }

    @Override
    public List<Auto> enBbox(Bbox bbox) {
        return repositorio.enBbox(bbox);
    }
}
