package dev.bryan.viajes;
import static org.junit.jupiter.api.Assertions.*;
import java.util.UUID;
import org.junit.jupiter.api.Test;
class CursorViajesTest {
    @Test void cursorConservaClaveYNoCruzaConsultas() {
        var filtro=new FiltroViajes("a",null,null,null);
        UUID id=new UUID(0,1);
        String c=CursorViajes.codificar("viajes",filtro,null,1,1000,id);
        assertEquals(id,CursorViajes.decodificar(c,"viajes",filtro,null,1).id());
        assertThrows(ConsultaViajesInvalidaException.class,()->CursorViajes.decodificar(c,"posiciones",filtro,id,1));
        assertThrows(ConsultaViajesInvalidaException.class,()->CursorViajes.decodificar("x".repeat(4097),"viajes",filtro,null,1));
    }
}
