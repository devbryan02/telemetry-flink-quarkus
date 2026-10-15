package dev.bryan.simulacion;
import java.time.Clock;
import java.util.HashMap;
import java.util.Map;
final class RelojEventos {
    private final Clock clock;
    private final Map<String,Long> ultimos=new HashMap<>();
    RelojEventos(Clock clock){this.clock=clock;}
    synchronized long siguiente(String carId){
        long ts=Math.max(clock.millis(),ultimos.getOrDefault(carId,-1L)+1);
        ultimos.put(carId,ts);return ts;
    }
}
