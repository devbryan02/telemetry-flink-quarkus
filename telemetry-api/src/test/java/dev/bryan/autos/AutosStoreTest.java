package dev.bryan.autos;
import static org.junit.jupiter.api.Assertions.*;
import dev.bryan.InMemoryKafkaResource;
import io.quarkus.test.common.QuarkusTestResource;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import javax.sql.DataSource;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
@QuarkusTest
@QuarkusTestResource(InMemoryKafkaResource.class)
class AutosStoreTest {
    @Inject AutosStore store;
    @Inject DataSource dataSource;
    static AutoEvento evento(String id,long ts) {
        return new AutoEvento(id,null,null,-12,-77,0,"ON",80,ts);
    }
    @BeforeEach void limpiar() throws Exception {
        try(var c=dataSource.getConnection();var s=c.createStatement()) {
            s.executeUpdate("DELETE FROM tb_ultima_posicion WHERE car_id LIKE 'store-%'");
        }
    }
    @Test void conservaMayorTimestampYConsolidaLote() {
        assertEquals(1,store.guardarLote(List.of(evento("store-a",100),evento("store-a",200))).size());
        assertTrue(store.guardarLote(List.of(evento("store-a",100),evento("store-a",200))).isEmpty());
        assertEquals(200L,store.todos().stream().filter(a->a.carId().equals("store-a")).findFirst().orElseThrow().ts());
    }
    @Test void escritoresConcurrentesNoRetroceden() {
        CompletableFuture.allOf(
            CompletableFuture.runAsync(()->store.guardarLote(List.of(evento("store-a",100)))),
            CompletableFuture.runAsync(()->store.guardarLote(List.of(evento("store-a",300))))
        ).join();
        assertEquals(300L,store.todos().stream().filter(a->a.carId().equals("store-a")).findFirst().orElseThrow().ts());
    }
    @Test void errorEnSegundaFilaReviertePrimera() {
        var invalido=new AutoEvento("store-z",null,null,100,-77,0,"ON",80,200);
        assertThrows(RuntimeException.class,()->store.guardarLote(List.of(evento("store-a",100),invalido)));
        assertTrue(store.todos().stream().noneMatch(a->a.carId().startsWith("store-")));
    }
}
