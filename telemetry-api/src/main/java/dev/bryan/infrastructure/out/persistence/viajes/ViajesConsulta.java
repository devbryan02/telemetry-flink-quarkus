package dev.bryan.infrastructure.out.persistence.viajes;

import dev.bryan.application.port.out.ViajesConsultaRepositorio;
import dev.bryan.domain.exception.ConsultaViajesInvalidaException;
import dev.bryan.domain.exception.ViajeNoEncontradoException;
import dev.bryan.domain.model.ConsultaPagina;
import dev.bryan.domain.model.FiltroPosiciones;
import dev.bryan.domain.model.FiltroViajes;
import dev.bryan.domain.model.Pagina;
import dev.bryan.domain.model.PosicionVista;
import dev.bryan.domain.model.ResumenViaje;
import dev.bryan.domain.model.ViajeDetalle;
import dev.bryan.domain.model.ViajeVista;
import dev.bryan.domain.service.ResumenViajeCalculador;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceException;
import jakarta.persistence.TypedQuery;
import jakarta.transaction.Transactional;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Stream;

/** Consultas de viajes con HQL: proyectan directo a los records de domain, sin cargar entities. */
@ApplicationScoped
class ViajesConsulta implements ViajesConsultaRepositorio {

    private static final String SELECT_VIAJE = "select new dev.bryan.domain.model.ViajeVista("
            + "v.viajeId, v.carreraId, v.carId, v.rutaId, v.companyId, v.fleetId, v.inicioViajeTs, v.finTs, "
            + "v.estado, v.motivoFin, v.ultimoTs) from ViajeEntity v";
    private static final String SELECT_POSICION = "select new dev.bryan.domain.model.PosicionVista("
            + "p.eventId, p.viajeId, p.tipoEvento, p.receivedAt, p.carId, p.companyId, p.fleetId, p.lat, p.lon, "
            + "p.heading, p.engine, p.battery, p.ts) from PosicionHistorialEntity p";

    @Inject EntityManager em;

    @Override
    @Transactional
    public ViajeDetalle detalle(UUID id) {
        try {
            // Una sola vista consistente del viaje y de sus muestras; vale solo para esta transacción
            em.createNativeQuery("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY").executeUpdate();
            ViajeVista viaje = obtener(id);
            TypedQuery<PosicionVista> q = em.createQuery(
                    SELECT_POSICION + " where p.viajeId = :viaje order by p.ts, p.eventId", PosicionVista.class)
                    .setParameter("viaje", id)
                    .setHint("org.hibernate.fetchSize", 1000);
            ResumenViaje resumen;
            try (Stream<PosicionVista> muestras = q.getResultStream()) {
                resumen = ResumenViajeCalculador.calcular(viaje, muestras.iterator());
            }
            return new ViajeDetalle(viaje, resumen);
        } catch (PersistenceException ex) {
            throw new IllegalStateException("No se pudo consultar detalle", ex);
        }
    }

    @Override
    @Transactional
    public Pagina<ViajeVista> listar(FiltroViajes f, ConsultaPagina p) {
        rango(f.desde(), f.hasta());
        var clave = CursorViajes.decodificar(p.cursor(), "viajes", f, null, p.limit());
        StringBuilder hql = new StringBuilder(SELECT_VIAJE + " where 1 = 1");
        Map<String, Object> args = new LinkedHashMap<>();
        agregar(hql, args, " and v.carId = :carId", "carId", f.carId());
        agregar(hql, args, " and v.carreraId = :carreraId", "carreraId", f.carreraId());
        agregar(hql, args, " and v.inicioViajeTs >= :desde", "desde", f.desde());
        agregar(hql, args, " and v.inicioViajeTs < :hasta", "hasta", f.hasta());
        if (clave != null) {
            hql.append(" and (v.inicioViajeTs, v.viajeId) < (:claveTs, :claveId)");
            args.put("claveTs", clave.ts());
            args.put("claveId", clave.id());
        }
        hql.append(" order by v.inicioViajeTs desc, v.viajeId desc");
        try {
            TypedQuery<ViajeVista> q = em.createQuery(hql.toString(), ViajeVista.class).setMaxResults(p.limit() + 1);
            args.forEach(q::setParameter);
            List<ViajeVista> rows = new ArrayList<>(q.getResultList());
            String cursor = null;
            if (rows.size() > p.limit()) {
                rows.remove(p.limit());
                var last = rows.get(rows.size() - 1);
                cursor = CursorViajes.codificar("viajes", f, null, p.limit(), last.inicioViajeTs(), last.viajeId());
            }
            return new Pagina<>(rows, cursor);
        } catch (PersistenceException ex) {
            throw new IllegalStateException("No se pudieron consultar viajes", ex);
        }
    }

    @Override
    @Transactional
    public Pagina<PosicionVista> posiciones(UUID id, FiltroPosiciones f, ConsultaPagina p) {
        rango(f.desde(), f.hasta());
        var clave = CursorViajes.decodificar(p.cursor(), "posiciones", f, id, p.limit());
        StringBuilder hql = new StringBuilder(SELECT_POSICION + " where p.viajeId = :viaje");
        Map<String, Object> args = new LinkedHashMap<>();
        args.put("viaje", id);
        agregar(hql, args, " and p.ts >= :desde", "desde", f.desde());
        agregar(hql, args, " and p.ts < :hasta", "hasta", f.hasta());
        if (clave != null) {
            hql.append(" and (p.ts, p.eventId) > (:claveTs, :claveId)");
            args.put("claveTs", clave.ts());
            args.put("claveId", clave.id());
        }
        hql.append(" order by p.ts, p.eventId");
        try {
            obtener(id);
            TypedQuery<PosicionVista> q = em.createQuery(hql.toString(), PosicionVista.class).setMaxResults(p.limit() + 1);
            args.forEach(q::setParameter);
            List<PosicionVista> rows = new ArrayList<>(q.getResultList());
            String cursor = null;
            if (rows.size() > p.limit()) {
                rows.remove(p.limit());
                var last = rows.get(rows.size() - 1);
                cursor = CursorViajes.codificar("posiciones", f, id, p.limit(), last.ts(), last.eventId());
            }
            return new Pagina<>(rows, cursor);
        } catch (PersistenceException ex) {
            throw new IllegalStateException("No se pudieron consultar muestras", ex);
        }
    }

    private ViajeVista obtener(UUID id) {
        List<ViajeVista> r = em.createQuery(SELECT_VIAJE + " where v.viajeId = :id", ViajeVista.class)
                .setParameter("id", id).getResultList();
        if (r.isEmpty()) {
            throw new ViajeNoEncontradoException();
        }
        return r.get(0);
    }

    static void rango(Long desde, Long hasta) {
        if ((desde != null && desde < 0) || (hasta != null && hasta < 0) || (desde != null && hasta != null && desde > hasta)) {
            throw new ConsultaViajesInvalidaException();
        }
    }

    private static void agregar(StringBuilder hql, Map<String, Object> args, String condicion, String nombre, Object valor) {
        if (valor != null) {
            hql.append(condicion);
            args.put(nombre, valor);
        }
    }
}
