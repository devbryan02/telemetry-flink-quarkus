package dev.bryan.application.port.out;

import dev.bryan.domain.model.ConsultaPagina;
import dev.bryan.domain.model.FiltroPosiciones;
import dev.bryan.domain.model.FiltroViajes;
import dev.bryan.domain.model.Pagina;
import dev.bryan.domain.model.PosicionVista;
import dev.bryan.domain.model.ViajeDetalle;
import dev.bryan.domain.model.ViajeVista;
import java.util.UUID;

public interface ViajesConsultaRepositorio {
    ViajeDetalle detalle(UUID viajeId);

    Pagina<ViajeVista> listar(FiltroViajes filtro, ConsultaPagina pagina);

    Pagina<PosicionVista> posiciones(UUID viajeId, FiltroPosiciones filtro, ConsultaPagina pagina);
}
