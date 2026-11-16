package dev.bryan.domain.service;
import java.time.Clock;
import java.util.HashMap;
import java.util.Map;
public final class RelojEventos {
    private final Clock clock;
    private final Map<String,Long> ultimos=new HashMap<>();
    public RelojEventos(Clock clock){this.clock=clock;}
    public synchronized long siguiente(String carId){
        long ts=Math.max(clock.millis(),ultimos.getOrDefault(carId,-1L)+1);
        ultimos.put(carId,ts);return ts;
    }
}
