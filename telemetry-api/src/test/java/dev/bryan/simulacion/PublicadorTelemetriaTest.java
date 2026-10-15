package dev.bryan.simulacion;
import static org.junit.jupiter.api.Assertions.*;
import java.lang.reflect.Proxy;
import java.util.concurrent.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.eclipse.microprofile.reactive.messaging.Emitter;
import org.junit.jupiter.api.Test;
class PublicadorTelemetriaTest {
    @Test @SuppressWarnings("unchecked") void nackSePropagaYNoSeFingeEntrega() {
        var publicador=new PublicadorTelemetria();
        publicador.mapper=new ObjectMapper();
        var ack=new CompletableFuture<Void>();
        publicador.telemetria=(Emitter<io.smallrye.reactive.messaging.kafka.Record<String,String>>)Proxy.newProxyInstance(
            Emitter.class.getClassLoader(),new Class[]{Emitter.class},(p,m,a)->{
                if(m.getName().equals("send"))return ack;
                throw new UnsupportedOperationException(m.getName());
            });
        var envio=publicador.publicar(new TelemetriaEvento("a",null,null,0,0,0,"ON",100,1000));
        ack.completeExceptionally(new IllegalStateException("broker fuera de servicio"));
        assertThrows(CompletionException.class,()->envio.toCompletableFuture().join());
    }
}
