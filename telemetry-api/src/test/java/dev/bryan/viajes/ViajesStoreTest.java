package dev.bryan.viajes;
import static org.junit.jupiter.api.Assertions.*;
import dev.bryan.InMemoryKafkaResource;
import io.quarkus.test.common.QuarkusTestResource;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import javax.sql.DataSource;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import org.junit.jupiter.api.*;
@QuarkusTest
@QuarkusTestResource(InMemoryKafkaResource.class)
class ViajesStoreTest {
    @Inject ViajesStore store;
    @Inject DataSource ds;
    static final UUID VIAJE=UUID.fromString("00000000-0000-0000-0000-000000000099");
    static EventoViaje evento(int id,long ts,String tipo,String fin){
        return new EventoViaje("viajes-test",null,null,0,id,0,"ON",100,ts,2,new UUID(0,id),new UUID(0,90),VIAJE,"ruta",1000L,tipo,fin);
    }
    @BeforeEach void limpiar() throws Exception {
        try(var c=ds.getConnection();var s=c.createStatement()){
            s.executeUpdate("DELETE FROM tb_posicion_historial");s.executeUpdate("DELETE FROM tb_viaje");
        }
    }
    long count() throws Exception {
        try(var c=ds.getConnection();var s=c.createStatement();var r=s.executeQuery("SELECT count(*) FROM tb_posicion_historial")){
            r.next();return r.getLong(1);
        }
    }
    @Test void guardaTardiosYReentregaSinDuplicar() throws Exception {
        store.guardarLote(List.of(evento(1,1000,"INICIO",null),evento(3,3000,"POSICION",null),evento(2,2000,"POSICION",null)));
        assertEquals(3,count());
        var r=store.guardarLote(List.of(evento(2,2000,"POSICION",null)));
        assertEquals(1,r.duplicados());assertEquals(0,r.insertados());assertEquals(3,count());
    }
    @Test void inicioTardioNoReabreCierre() throws Exception {
        store.guardarLote(List.of(evento(4,4000,"FIN","META")));
        store.guardarLote(List.of(evento(1,1000,"INICIO",null)));
        try(var c=ds.getConnection();var s=c.createStatement();var r=s.executeQuery("SELECT estado,fin_ts FROM tb_viaje")){
            assertTrue(r.next());assertEquals("FINALIZADO",r.getString(1));assertEquals(4000,r.getLong(2));
        }
        assertThrows(RuntimeException.class,()->store.guardarLote(List.of(evento(5,5000,"POSICION",null))));
    }
    @Test void conflictoDeIdentidadRevierteLoteCompleto() throws Exception {
        store.guardarLote(List.of(evento(1,1000,"INICIO",null)));
        assertThrows(RuntimeException.class,()->store.guardarLote(List.of(evento(2,2000,"POSICION",null),evento(1,3000,"POSICION",null))));
        assertEquals(1,count());
    }
    @Test void rechazaFinAnteriorAMuestraYConservaEmpates() throws Exception {
        store.guardarLote(List.of(evento(2,3000,"POSICION",null),evento(3,3000,"POSICION",null)));
        assertEquals(2,count());
        assertThrows(RuntimeException.class,()->store.guardarLote(List.of(evento(4,2000,"FIN","META"))));
        assertEquals(2,count());
    }
    @Test void concurrenciaConservaAmbosEventos() throws Exception {
        CompletableFuture.allOf(
            CompletableFuture.runAsync(()->store.guardarLote(List.of(evento(2,2000,"POSICION",null)))),
            CompletableFuture.runAsync(()->store.guardarLote(List.of(evento(3,3000,"POSICION",null))))
        ).join();
        assertEquals(2,count());
    }
}
