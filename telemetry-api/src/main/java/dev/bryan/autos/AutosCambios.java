package dev.bryan.autos;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
/** Solo pendientes de difusión, nunca la fuente de consulta de posiciones. */
@ApplicationScoped
class AutosCambios {
    private final ConcurrentHashMap<String,Auto> pendientes=new ConcurrentHashMap<>();
    void registrar(List<Auto> autos) {
        for(var a:autos)pendientes.merge(a.carId(),a,(actual,nuevo)->nuevo.ts()>actual.ts()?nuevo:actual);
    }
    List<Auto> drenar() {
        List<Auto> lote=new ArrayList<>();
        pendientes.forEach((id,auto)->{if(pendientes.remove(id,auto))lote.add(auto);});
        return lote;
    }
}
