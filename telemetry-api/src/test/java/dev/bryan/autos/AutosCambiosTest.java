package dev.bryan.autos;
import static org.junit.jupiter.api.Assertions.*;
import java.util.List;
import org.junit.jupiter.api.Test;
class AutosCambiosTest {
    @Test void agrupaYNoRetrocedeMientrasEstaPendiente() {
        var cambios=new AutosCambios();
        cambios.registrar(List.of(new Auto("a",null,null,0,0,0,"ON",100,200)));
        cambios.registrar(List.of(new Auto("a",null,null,0,0,0,"ON",100,100)));
        assertEquals(200L,cambios.drenar().get(0).ts());
        assertTrue(cambios.drenar().isEmpty());
    }
    @Test void actualizacionPosteriorSeEntregaEnSiguienteDrenado() {
        var cambios=new AutosCambios();
        cambios.registrar(List.of(new Auto("a",null,null,0,0,0,"ON",100,100)));
        assertEquals(1,cambios.drenar().size());
        cambios.registrar(List.of(new Auto("a",null,null,0,0,0,"ON",100,200)));
        assertEquals(200L,cambios.drenar().get(0).ts());
    }
}
