package dev.bryan.application.port.out;

import dev.bryan.domain.model.Escenario;
import dev.bryan.domain.model.ResumenRuta;
import dev.bryan.domain.model.Ruta;
import java.util.List;

/** Rutas de carrera y escenarios (hoy, recursos del classpath). */
public interface CatalogoRutas {
    List<ResumenRuta> listar();

    byte[] geojson(String id);

    /** La polilínea de la ruta en el sentido de la carrera (de la salida a la meta). */
    Ruta ruta(String id);

    Escenario escenario(String nombre);
}
