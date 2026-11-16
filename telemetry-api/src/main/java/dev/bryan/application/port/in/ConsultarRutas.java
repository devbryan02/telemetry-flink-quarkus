package dev.bryan.application.port.in;

import dev.bryan.domain.model.ResumenRuta;
import java.util.List;

public interface ConsultarRutas {
    List<ResumenRuta> listar();

    /** El GeoJSON de la ruta tal cual, para dibujarla en el dashboard. */
    byte[] geojson(String id);
}
