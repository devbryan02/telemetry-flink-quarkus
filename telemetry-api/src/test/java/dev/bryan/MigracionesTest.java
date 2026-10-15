package dev.bryan;

import static org.junit.jupiter.api.Assertions.*;
import io.quarkus.test.common.QuarkusTestResource;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import javax.sql.DataSource;
import java.sql.SQLException;
import org.junit.jupiter.api.Test;

@QuarkusTest
@QuarkusTestResource(InMemoryKafkaResource.class)
class MigracionesTest {
    @Inject DataSource dataSource;
    @Inject org.flywaydb.core.Flyway flyway;

    @Test void conservaDatosAlMigrarOtraVez() throws Exception {
        try (var c = dataSource.getConnection(); var s = c.createStatement()) {
            s.executeUpdate("INSERT INTO tb_ultima_posicion(car_id,lat,lon,heading,engine,battery,ts) VALUES('migration-test',0,0,0,'ON',100,1)");
            try {
                flyway.migrate();
                try (var r = s.executeQuery("SELECT ts FROM tb_ultima_posicion WHERE car_id='migration-test'")) {
                    assertTrue(r.next()); assertEquals(1L,r.getLong(1));
                }
            } finally { s.executeUpdate("DELETE FROM tb_ultima_posicion WHERE car_id='migration-test'"); }
        }
    }

    @Test void creaEsquemaConTablasEIndices() throws Exception {
        try (var c = dataSource.getConnection(); var s = c.createStatement()) {
            for (String table : new String[]{"tb_ultima_posicion", "tb_viaje", "tb_posicion_historial"}) {
                try (var r = s.executeQuery("SELECT count(*) FROM " + table)) {
                    assertTrue(r.next());
                }
            }
            try (var r = s.executeQuery("SELECT count(*) FROM pg_indexes WHERE indexname='idx_tb_posicion_historial_viaje_ts_event'")) {
                r.next(); assertEquals(1, r.getInt(1));
            }
            assertNotEquals("jdbc:postgresql://postgres:5432/telemetria", c.getMetaData().getURL());
        }
    }

    @Test void rechazaIdentidadesYRelacionesIncompletas() throws Exception {
        try (var c = dataSource.getConnection(); var s = c.createStatement()) {
            assertThrows(SQLException.class, () -> s.executeUpdate("INSERT INTO tb_viaje(viaje_id) VALUES(gen_random_uuid())"));
            assertThrows(SQLException.class, () -> s.executeUpdate("INSERT INTO tb_posicion_historial(event_id,viaje_id) VALUES(gen_random_uuid(),gen_random_uuid())"));
        }
    }
}
