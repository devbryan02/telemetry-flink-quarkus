package dev.bryan.application.service;

import dev.bryan.application.port.in.ConsultarViajes;
import dev.bryan.application.port.out.ViajesConsultaRepositorio;
import dev.bryan.domain.model.ConsultaPagina;
import dev.bryan.domain.model.FiltroPosiciones;
import dev.bryan.domain.model.FiltroViajes;
import dev.bryan.domain.model.Pagina;
import dev.bryan.domain.model.PosicionVista;
import dev.bryan.domain.model.ViajeDetalle;
import dev.bryan.domain.model.ViajeVista;
import java.util.UUID;

public class ViajesService implements ConsultarViajes {

    private final ViajesConsultaRepositorio repositorio;

    public ViajesService(ViajesConsultaRepositorio repositorio) {
        this.repositorio = repositorio;
    }

    @Override
    public ViajeDetalle detalle(UUID viajeId) {
        return repositorio.detalle(viajeId);
    }

    @Override
    public Pagina<ViajeVista> listar(FiltroViajes filtro, ConsultaPagina pagina) {
        return repositorio.listar(filtro, pagina);
    }

    @Override
    public Pagina<PosicionVista> posiciones(UUID viajeId, FiltroPosiciones filtro, ConsultaPagina pagina) {
        return repositorio.posiciones(viajeId, filtro, pagina);
    }
}
