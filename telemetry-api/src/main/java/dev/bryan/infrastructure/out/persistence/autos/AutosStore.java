package dev.bryan.infrastructure.out.persistence.autos;

import dev.bryan.application.port.out.AutosRepositorio;
import dev.bryan.domain.model.Auto;
import dev.bryan.domain.model.AutoEvento;
import dev.bryan.domain.model.Bbox;
import dev.bryan.infrastructure.out.persistence.NativoSql;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceException;
import jakarta.persistence.Query;
import jakarta.transaction.Transactional;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;
import org.hibernate.type.StandardBasicTypes;

/** Adaptador de persistencia de la última posición: Panache para leer, SQL nativo para el upsert atómico. */
@ApplicationScoped
class AutosStore implements AutosRepositorio {

    /** Solo gana el `ts` mayor, de forma atómica; devuelve la fila únicamente si hubo cambio. */
    private static final String UPSERT = """
            INSERT INTO tb_ultima_posicion(car_id,company_id,fleet_id,lat,lon,heading,engine,battery,ts,schema_version,event_id,carrera_id,viaje_id,ruta_id,inicio_viaje_ts,tipo_evento,motivo_fin)
            VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17)
            ON CONFLICT(car_id) DO UPDATE SET
            company_id=excluded.company_id,fleet_id=excluded.fleet_id,lat=excluded.lat,lon=excluded.lon,
            heading=excluded.heading,engine=excluded.engine,battery=excluded.battery,ts=excluded.ts,
            schema_version=excluded.schema_version,event_id=excluded.event_id,carrera_id=excluded.carrera_id,
            viaje_id=excluded.viaje_id,ruta_id=excluded.ruta_id,inicio_viaje_ts=excluded.inicio_viaje_ts,
            tipo_evento=excluded.tipo_evento,motivo_fin=excluded.motivo_fin
            WHERE excluded.ts > tb_ultima_posicion.ts RETURNING *
            """;

    @Inject UltimaPosicionRepository repositorio;
    @Inject EntityManager em;

    @Override
    @Transactional
    public List<Auto> guardarLote(List<AutoEvento> lote) {
        Map<String, AutoEvento> ultimos = new TreeMap<>();
        for (var evento : lote) {
            ultimos.merge(evento.carId(), evento, (a, b) -> a.ts() >= b.ts() ? a : b);
        }
        try {
            List<Auto> cambios = new ArrayList<>();
            for (var e : ultimos.values()) {
                Query q = em.createNativeQuery(UPSERT, UltimaPosicionEntity.class);
                NativoSql.parametro(q, 1, e.carId(), StandardBasicTypes.STRING);
                NativoSql.parametro(q, 2, e.companyId(), StandardBasicTypes.STRING);
                NativoSql.parametro(q, 3, e.fleetId(), StandardBasicTypes.STRING);
                NativoSql.parametro(q, 4, e.lat(), StandardBasicTypes.DOUBLE);
                NativoSql.parametro(q, 5, e.lon(), StandardBasicTypes.DOUBLE);
                NativoSql.parametro(q, 6, e.heading(), StandardBasicTypes.INTEGER);
                NativoSql.parametro(q, 7, e.engine(), StandardBasicTypes.STRING);
                NativoSql.parametro(q, 8, e.battery(), StandardBasicTypes.INTEGER);
                NativoSql.parametro(q, 9, e.ts(), StandardBasicTypes.LONG);
                NativoSql.parametro(q, 10, e.schemaVersion(), StandardBasicTypes.INTEGER);
                NativoSql.parametro(q, 11, e.eventId(), StandardBasicTypes.UUID);
                NativoSql.parametro(q, 12, e.carreraId(), StandardBasicTypes.UUID);
                NativoSql.parametro(q, 13, e.viajeId(), StandardBasicTypes.UUID);
                NativoSql.parametro(q, 14, e.rutaId(), StandardBasicTypes.STRING);
                NativoSql.parametro(q, 15, e.inicioViajeTs(), StandardBasicTypes.LONG);
                NativoSql.parametro(q, 16, e.tipoEvento(), StandardBasicTypes.STRING);
                NativoSql.parametro(q, 17, e.motivoFin(), StandardBasicTypes.STRING);
                @SuppressWarnings("unchecked")
                List<UltimaPosicionEntity> filas = q.getResultList();
                if (!filas.isEmpty()) {
                    cambios.add(aAuto(filas.get(0)));
                }
            }
            return cambios;
        } catch (PersistenceException ex) {
            throw new IllegalStateException("No se pudieron persistir posiciones", ex);
        }
    }

    @Override
    @Transactional
    public List<Auto> todos() {
        try {
            return repositorio.listAll(Sort.by("carId")).stream().map(AutosStore::aAuto).toList();
        } catch (PersistenceException ex) {
            throw new IllegalStateException("No se pudieron consultar posiciones", ex);
        }
    }

    @Override
    @Transactional
    public List<Auto> enBbox(Bbox b) {
        try {
            return repositorio.list("lon >= ?1 and lat >= ?2 and lon <= ?3 and lat <= ?4", Sort.by("carId"),
                    b.minLon(), b.minLat(), b.maxLon(), b.maxLat()).stream().map(AutosStore::aAuto).toList();
        } catch (PersistenceException ex) {
            throw new IllegalStateException("No se pudieron consultar posiciones", ex);
        }
    }

    private static Auto aAuto(UltimaPosicionEntity e) {
        return new Auto(e.carId, e.companyId, e.fleetId, e.lat, e.lon, e.heading, e.engine, e.battery, e.ts);
    }
}
