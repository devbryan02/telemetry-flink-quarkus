package dev.bryan.infrastructure.out.persistence.viajes;

import com.fasterxml.jackson.databind.ObjectMapper;
import dev.bryan.application.port.out.ViajesRepositorio;
import dev.bryan.domain.model.EstadoViaje;
import dev.bryan.domain.model.EventoViaje;
import dev.bryan.domain.model.ResultadoIngesta;
import dev.bryan.infrastructure.in.messaging.viajes.EventoJson;
import dev.bryan.infrastructure.out.persistence.NativoSql;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import jakarta.persistence.PersistenceException;
import jakarta.persistence.Query;
import jakarta.transaction.Transactional;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import org.hibernate.type.StandardBasicTypes;

/**
 * Ingesta idempotente: la transacción termina al salir de {@link #guardarLote}, antes de que el consumidor
 * confirme el offset. Los altas idempotentes son SQL nativo; el viaje se bloquea y se actualiza por entity.
 */
@ApplicationScoped
public class ViajesStore implements ViajesRepositorio {
    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Inject ViajeRepository viajes;
    @Inject EntityManager em;

    @Override
    @Transactional
    public ResultadoIngesta guardarLote(List<EventoViaje> eventos) {
        List<EventoViaje> nuevos = new ArrayList<>();
        int legados = 0;
        for (var e : eventos) {
            try {
                EventoJson.validar(MAPPER.valueToTree(e));
            } catch (Exception ex) {
                throw new IllegalArgumentException("Evento de viaje invalido", ex);
            }
            if (e.schemaVersion() == null || e.schemaVersion() == 1) {
                legados++;
            } else {
                nuevos.add(e);
            }
        }
        nuevos.sort(Comparator.comparing(e -> e.viajeId().toString()));
        int insertados = 0, duplicados = 0;
        try {
            for (var e : nuevos) {
                // El SQL nativo no actualiza las entities gestionadas: se vacía el contexto y se relee con bloqueo.
                em.flush();
                em.clear();
                crearViaje(e);
                ViajeEntity v = viajes.findById(e.viajeId(), LockModeType.PESSIMISTIC_WRITE);   // FOR UPDATE
                if (v == null) {
                    throw new IllegalStateException("Viaje ausente durante ingesta");
                }
                comprobarContexto(v, e);
                var previo = buscarEvento(e.eventId());
                if (previo != null) {
                    if (!previo.equals(e)) {
                        throw conflicto(e);
                    }
                    duplicados++;
                    continue;
                }
                Long fin = v.finTs;
                if (fin != null && e.ts() > fin) {
                    throw conflicto(e);
                }
                if ("FIN".equals(e.tipoEvento())) {
                    if (e.ts() < v.ultimoTs) {
                        throw conflicto(e);
                    }
                    if (fin != null && (fin != e.ts() || !Objects.equals(v.motivoFin, e.motivoFin()))) {
                        throw conflicto(e);
                    }
                }
                if (!insertarEvento(e)) {
                    if (!e.equals(buscarEvento(e.eventId()))) {
                        throw conflicto(e);
                    }
                    duplicados++;
                    continue;
                }
                boolean cierre = "FIN".equals(e.tipoEvento());
                v.ultimoTs = Math.max(v.ultimoTs, e.ts());
                if (cierre) {
                    v.finTs = e.ts();
                    v.estado = EstadoViaje.valueOf("META".equals(e.motivoFin()) ? "FINALIZADO" : e.motivoFin());
                    v.motivoFin = e.motivoFin();
                }
                insertados++;
            }
            em.flush();
        } catch (PersistenceException ex) {
            throw new IllegalStateException("No se pudo persistir historial", ex);
        }
        return new ResultadoIngesta(insertados, duplicados, legados);
    }

    private void crearViaje(EventoViaje e) {
        Query q = em.createNativeQuery("""
                INSERT INTO tb_viaje(viaje_id,carrera_id,car_id,ruta_id,company_id,fleet_id,inicio_viaje_ts,ultimo_ts,estado)
                VALUES(?1,?2,?3,?4,?5,?6,?7,?8,'SIN_CIERRE') ON CONFLICT(viaje_id) DO NOTHING
                """);
        NativoSql.parametro(q, 1, e.viajeId(), StandardBasicTypes.UUID);
        NativoSql.parametro(q, 2, e.carreraId(), StandardBasicTypes.UUID);
        NativoSql.parametro(q, 3, e.carId(), StandardBasicTypes.STRING);
        NativoSql.parametro(q, 4, e.rutaId(), StandardBasicTypes.STRING);
        NativoSql.parametro(q, 5, e.companyId(), StandardBasicTypes.STRING);
        NativoSql.parametro(q, 6, e.fleetId(), StandardBasicTypes.STRING);
        NativoSql.parametro(q, 7, e.inicioViajeTs(), StandardBasicTypes.LONG);
        NativoSql.parametro(q, 8, e.ts(), StandardBasicTypes.LONG);
        q.executeUpdate();
    }

    private void comprobarContexto(ViajeEntity v, EventoViaje e) {
        if (!Objects.equals(v.carreraId, e.carreraId()) || !Objects.equals(v.carId, e.carId())
                || !Objects.equals(v.rutaId, e.rutaId()) || !Objects.equals(v.companyId, e.companyId())
                || !Objects.equals(v.fleetId, e.fleetId()) || v.inicioViajeTs != e.inicioViajeTs()) {
            throw conflicto(e);
        }
    }

    private EventoViaje buscarEvento(UUID id) {
        PosicionHistorialEntity p = em.find(PosicionHistorialEntity.class, id);
        return p == null ? null : new EventoViaje(p.carId, p.companyId, p.fleetId, p.lat, p.lon, p.heading,
                p.engine, p.battery, p.ts, p.schemaVersion, p.eventId, p.carreraId, p.viajeId, p.rutaId,
                p.inicioViajeTs, p.tipoEvento, p.motivoFin);
    }

    /** @return {@code true} si se insertó; {@code false} si el {@code eventId} ya existía */
    private boolean insertarEvento(EventoViaje e) {
        Query q = em.createNativeQuery("""
                INSERT INTO tb_posicion_historial(car_id,company_id,fleet_id,lat,lon,heading,engine,battery,ts,
                schema_version,event_id,carrera_id,viaje_id,ruta_id,inicio_viaje_ts,tipo_evento,motivo_fin)
                VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17)
                ON CONFLICT(event_id) DO NOTHING
                """);
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
        return q.executeUpdate() > 0;
    }

    @Transactional
    public long sinCierre() {
        try {
            return viajes.count("estado", EstadoViaje.SIN_CIERRE);
        } catch (PersistenceException ex) {
            throw new IllegalStateException("No se pudieron contar viajes sin cierre", ex);
        }
    }

    /** Solo identificadores: el payload y los datos de conexión no van al mensaje ni a los logs. */
    private static IllegalStateException conflicto(EventoViaje e) {
        return new IllegalStateException("Conflicto de integridad en historial eventId=" + e.eventId() + " viajeId=" + e.viajeId());
    }
}
