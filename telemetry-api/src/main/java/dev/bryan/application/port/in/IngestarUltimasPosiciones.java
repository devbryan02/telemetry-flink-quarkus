package dev.bryan.application.port.in;

import dev.bryan.domain.model.AutoEvento;
import java.util.List;

public interface IngestarUltimasPosiciones {
    /** Persiste el lote (solo gana el `ts` más reciente por auto) y deja los cambios listos para difundir. */
    void ingestar(List<AutoEvento> lote);
}
