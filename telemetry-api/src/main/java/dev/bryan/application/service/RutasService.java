package dev.bryan.application.service;

import dev.bryan.application.port.in.ConsultarRutas;
import dev.bryan.application.port.out.CatalogoRutas;
import dev.bryan.domain.model.ResumenRuta;
import java.util.List;

public class RutasService implements ConsultarRutas {

    private final CatalogoRutas catalogo;

    public RutasService(CatalogoRutas catalogo) {
        this.catalogo = catalogo;
    }

    @Override
    public List<ResumenRuta> listar() {
        return catalogo.listar();
    }

    @Override
    public byte[] geojson(String id) {
        return catalogo.geojson(id);
    }
}
