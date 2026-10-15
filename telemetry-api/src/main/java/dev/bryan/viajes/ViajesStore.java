package dev.bryan.viajes;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import javax.sql.DataSource;
import java.sql.*;
import java.util.*;

/** Ingesta idempotente: la transacción termina antes de entregar el resultado al consumidor. */
@ApplicationScoped
class ViajesStore {
    private static final ObjectMapper MAPPER=new ObjectMapper();
    @Inject DataSource ds;

    ResultadoIngesta guardarLote(List<EventoViaje> eventos) {
        List<EventoViaje> nuevos=new ArrayList<>();int legados=0;
        for(var e:eventos) {
            try{EventoJson.validar(MAPPER.valueToTree(e));}
            catch(Exception ex){throw new IllegalArgumentException("Evento de viaje invalido",ex);}
            if(e.schemaVersion()==null||e.schemaVersion()==1)legados++;else nuevos.add(e);
        }
        nuevos.sort(Comparator.comparing(e->e.viajeId().toString()));
        int insertados=0,duplicados=0;
        try(var c=ds.getConnection()){
            c.setAutoCommit(false);
            try{
                for(var e:nuevos){
                    crearViaje(c,e);
                    try(var s=c.prepareStatement("SELECT * FROM tb_viaje WHERE viaje_id=? FOR UPDATE")){
                        s.setObject(1,e.viajeId());
                        try(var r=s.executeQuery()){
                            if(!r.next())throw new IllegalStateException("Viaje ausente durante ingesta");
                            comprobarContexto(r,e);
                            var previo=buscarEvento(c,e.eventId());
                            if(previo!=null){
                                if(!previo.equals(e))throw conflicto();
                                duplicados++;continue;
                            }
                            Long fin=r.getObject("fin_ts",Long.class);
                            if(fin!=null&&e.ts()>fin)throw conflicto();
                            if("FIN".equals(e.tipoEvento())){
                                if(e.ts()<r.getLong("ultimo_ts"))throw conflicto();
                                if(fin!=null&&(fin!=e.ts()||!Objects.equals(r.getString("motivo_fin"),e.motivoFin())))throw conflicto();
                            }
                        }
                    }
                    if(!insertarEvento(c,e)){
                        if(!e.equals(buscarEvento(c,e.eventId())))throw conflicto();
                        duplicados++;continue;
                    }
                    boolean cierre="FIN".equals(e.tipoEvento());
                    String estado=cierre?("META".equals(e.motivoFin())?"FINALIZADO":e.motivoFin()):null;
                    try(var s=c.prepareStatement("""
                        UPDATE tb_viaje SET ultimo_ts=greatest(ultimo_ts,?),
                        fin_ts=CASE WHEN ? THEN ? ELSE fin_ts END,
                        estado=CASE WHEN ? THEN ? ELSE estado END,
                        motivo_fin=CASE WHEN ? THEN ? ELSE motivo_fin END WHERE viaje_id=?
                        """)){
                        s.setLong(1,e.ts());s.setBoolean(2,cierre);s.setLong(3,e.ts());
                        s.setBoolean(4,cierre);s.setString(5,estado);s.setBoolean(6,cierre);s.setString(7,e.motivoFin());
                        s.setObject(8,e.viajeId());s.executeUpdate();
                    }
                    insertados++;
                }
                c.commit();
            }catch(SQLException|RuntimeException ex){
                try{c.rollback();}catch(SQLException rollback){ex.addSuppressed(rollback);}
                throw ex;
            }
        }catch(SQLException ex){throw new IllegalStateException("No se pudo persistir historial",ex);}
        return new ResultadoIngesta(insertados,duplicados,legados);
    }
    private void crearViaje(Connection c,EventoViaje e)throws SQLException{
        try(var s=c.prepareStatement("""
            INSERT INTO tb_viaje(viaje_id,carrera_id,car_id,ruta_id,company_id,fleet_id,inicio_viaje_ts,ultimo_ts,estado)
            VALUES(?,?,?,?,?,?,?,?,'SIN_CIERRE') ON CONFLICT(viaje_id) DO NOTHING
            """)){
            s.setObject(1,e.viajeId());s.setObject(2,e.carreraId());s.setString(3,e.carId());s.setString(4,e.rutaId());
            s.setString(5,e.companyId());s.setString(6,e.fleetId());s.setLong(7,e.inicioViajeTs());s.setLong(8,e.ts());s.executeUpdate();
        }
    }
    private void comprobarContexto(ResultSet r,EventoViaje e)throws SQLException{
        if(!Objects.equals(r.getObject("carrera_id",UUID.class),e.carreraId())
            ||!Objects.equals(r.getString("car_id"),e.carId())||!Objects.equals(r.getString("ruta_id"),e.rutaId())
            ||!Objects.equals(r.getString("company_id"),e.companyId())||!Objects.equals(r.getString("fleet_id"),e.fleetId())
            ||r.getLong("inicio_viaje_ts")!=e.inicioViajeTs())throw conflicto();
    }
    private EventoViaje buscarEvento(Connection c,UUID id)throws SQLException{
        try(var s=c.prepareStatement("SELECT * FROM tb_posicion_historial WHERE event_id=?")){
            s.setObject(1,id);try(var r=s.executeQuery()){return r.next()?evento(r):null;}
        }
    }
    private boolean insertarEvento(Connection c,EventoViaje e)throws SQLException{
        try(var s=c.prepareStatement("""
            INSERT INTO tb_posicion_historial(car_id,company_id,fleet_id,lat,lon,heading,engine,battery,ts,
            schema_version,event_id,carrera_id,viaje_id,ruta_id,inicio_viaje_ts,tipo_evento,motivo_fin)
            VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            ON CONFLICT(event_id) DO NOTHING RETURNING event_id
            """)){
            s.setString(1,e.carId());s.setString(2,e.companyId());s.setString(3,e.fleetId());
            s.setDouble(4,e.lat());s.setDouble(5,e.lon());s.setInt(6,e.heading());s.setString(7,e.engine());s.setInt(8,e.battery());s.setLong(9,e.ts());
            s.setInt(10,e.schemaVersion());s.setObject(11,e.eventId());s.setObject(12,e.carreraId());s.setObject(13,e.viajeId());
            s.setString(14,e.rutaId());s.setLong(15,e.inicioViajeTs());s.setString(16,e.tipoEvento());s.setString(17,e.motivoFin());
            try(var r=s.executeQuery()){return r.next();}
        }
    }
    private static EventoViaje evento(ResultSet r)throws SQLException{
        return new EventoViaje(r.getString("car_id"),r.getString("company_id"),r.getString("fleet_id"),r.getDouble("lat"),r.getDouble("lon"),
            r.getInt("heading"),r.getString("engine"),r.getInt("battery"),r.getLong("ts"),r.getInt("schema_version"),
            r.getObject("event_id",UUID.class),r.getObject("carrera_id",UUID.class),r.getObject("viaje_id",UUID.class),
            r.getString("ruta_id"),r.getLong("inicio_viaje_ts"),r.getString("tipo_evento"),r.getString("motivo_fin"));
    }
    private static IllegalStateException conflicto(){return new IllegalStateException("Conflicto de integridad en historial");}
}
