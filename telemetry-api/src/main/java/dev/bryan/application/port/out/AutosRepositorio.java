package dev.bryan.application.port.out;

import dev.bryan.domain.model.Auto;
import dev.bryan.domain.model.AutoEvento;
import dev.bryan.domain.model.Bbox;
import java.util.List;

public interface AutosRepositorio {
    /** Upsert transaccional por auto, solo si el `ts` es mayor. Devuelve los autos que cambiaron. */
    List<Auto> guardarLote(List<AutoEvento> lote);

    List<Auto> todos();

    List<Auto> enBbox(Bbox bbox);
}
