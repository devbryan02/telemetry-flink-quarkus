package dev.bryan.viajes;
import static org.junit.jupiter.api.Assertions.*;
import java.time.Instant;
import java.util.*;
import org.junit.jupiter.api.Test;
class ResumenViajeTest {
    static ViajeVista viaje(Long fin){
        return new ViajeVista(new UUID(0,1),new UUID(0,2),"a","ruta",null,null,1000,fin,fin==null?EstadoViaje.SIN_CIERRE:EstadoViaje.FINALIZADO,fin==null?null:"META",fin==null?2000:fin);
    }
    static PosicionVista punto(long ts,double lat,double lon,int id){
        return new PosicionVista(new UUID(0,id),new UUID(0,1),"POSICION",Instant.EPOCH,"a",null,null,lat,lon,0,"ON",100,ts);
    }
    @Test void calculaDistanciaYVelocidadConRadioEspecificado(){
        var r=ResumenViajeCalculador.calcular(viaje(null),List.of(punto(1000,0,0,1),punto(2000,0,1,2)).iterator());
        assertEquals(111194.9266,r.distanciaObservadaM(),0.01);
        assertEquals(400301.7359,r.velocidadMediaObservadaKmh(),0.1);
        assertEquals(1000,r.duracionObservadaMs());assertNull(r.duracionViajeMs());
    }
    @Test void unaMuestraYEmpatesNoInventanDuracion(){
        var r=ResumenViajeCalculador.calcular(viaje(null),List.of(punto(1000,0,0,1),punto(1000,0,80,2)).iterator());
        assertEquals(2,r.cantidadMuestras());assertEquals(0,r.distanciaObservadaM());assertNull(r.velocidadMediaObservadaKmh());
        assertEquals(0,r.maxIntervaloMuestrasMs());
        var uno=ResumenViajeCalculador.calcular(viaje(4000L),List.of(punto(1000,0,0,1)).iterator());
        assertEquals(3000L,uno.duracionViajeMs());assertEquals(0,uno.duracionObservadaMs());
    }
    @Test void atraviesaAntimeridianoPorDistanciaCorta(){
        var r=ResumenViajeCalculador.calcular(viaje(null),List.of(punto(1000,0,179,1),punto(2000,0,-179,2)).iterator());
        assertEquals(222389.8533,r.distanciaObservadaM(),0.1);
    }
}
