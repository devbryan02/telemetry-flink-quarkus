package dev.bryan.infrastructure.out.ws;
import dev.bryan.application.port.out.DifusionAutos;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import dev.bryan.domain.model.Auto;
/** Solo pendientes de difusión, nunca la fuente de consulta de posiciones. */
@ApplicationScoped
public class AutosCambios implements DifusionAutos {
    private final ConcurrentHashMap<String,Auto> pendientes=new ConcurrentHashMap<>();
    @Override public void registrar(List<Auto> autos) {
        for(var a:autos)pendientes.merge(a.carId(),a,(actual,nuevo)->nuevo.ts()>actual.ts()?nuevo:actual);
    }
    public List<Auto> drenar() {
        List<Auto> lote=new ArrayList<>();
        pendientes.forEach((id,auto)->{if(pendientes.remove(id,auto))lote.add(auto);});
        return lote;
    }
}
