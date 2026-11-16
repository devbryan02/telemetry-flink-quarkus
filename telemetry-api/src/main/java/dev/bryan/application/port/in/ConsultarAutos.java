package dev.bryan.application.port.in;

import dev.bryan.domain.model.Auto;
import dev.bryan.domain.model.Bbox;
import java.util.List;

public interface ConsultarAutos {
    List<Auto> todos();

    List<Auto> enBbox(Bbox bbox);
}
