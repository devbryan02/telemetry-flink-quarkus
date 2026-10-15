package dev.bryan.viajes;
import java.util.Iterator;
/** Consume orden SQL (ts,event_id): el primer UUID de cada timestamp representa su punto observado. */
final class ResumenViajeCalculador {
    static ResumenViaje calcular(ViajeVista viaje,Iterator<PosicionVista> muestras){
        long cantidad=0,primero=0,ultimo=0,maxIntervalo=0;double distancia=0;
        PosicionVista anterior=null;
        while(muestras.hasNext()){
            var p=muestras.next();cantidad++;
            if(anterior==null){primero=p.ts();ultimo=p.ts();anterior=p;continue;}
            if(p.ts()<ultimo)throw new IllegalStateException("Muestras sin orden cronologico");
            if(p.ts()==ultimo)continue;
            maxIntervalo=Math.max(maxIntervalo,p.ts()-ultimo);
            distancia+=metros(anterior,p);
            ultimo=p.ts();anterior=p;
        }
        if(cantidad==0)throw new IllegalStateException("Viaje sin muestras");
        long duracion=ultimo-primero;
        return new ResumenViaje(cantidad,ultimo,duracion,
            viaje.finTs()==null?null:viaje.finTs()-viaje.inicioViajeTs(),
            distancia,duracion==0?null:distancia*3600/duracion,maxIntervalo);
    }
    private static double metros(PosicionVista a,PosicionVista b){
        double lat1=Math.toRadians(a.lat()),lat2=Math.toRadians(b.lat());
        double dlat=lat2-lat1,dlon=Math.toRadians(b.lon()-a.lon());
        double h=Math.pow(Math.sin(dlat/2),2)+Math.cos(lat1)*Math.cos(lat2)*Math.pow(Math.sin(dlon/2),2);
        return 2*6371000*Math.asin(Math.sqrt(Math.max(0,Math.min(1,h))));
    }
}
