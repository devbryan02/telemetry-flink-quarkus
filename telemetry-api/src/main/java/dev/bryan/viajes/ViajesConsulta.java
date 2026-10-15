package dev.bryan.viajes;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import javax.sql.DataSource;
import java.sql.*;
import java.util.*;

@ApplicationScoped
class ViajesConsulta {
    @Inject DataSource ds;
    ViajeDetalle detalle(UUID id){
        try(var c=ds.getConnection()){
            c.setReadOnly(true);c.setTransactionIsolation(Connection.TRANSACTION_REPEATABLE_READ);c.setAutoCommit(false);
            try{
                var viaje=obtener(c,id);
                ResumenViaje resumen;
                try(var s=c.prepareStatement("SELECT * FROM tb_posicion_historial WHERE viaje_id=? ORDER BY ts,event_id")){
                    s.setObject(1,id);s.setFetchSize(1000);
                    try(var r=s.executeQuery()){
                        Iterator<PosicionVista> iterador=new Iterator<>(){
                            boolean cargado,hay;
                            public boolean hasNext(){
                                try{if(!cargado){hay=r.next();cargado=true;}return hay;}
                                catch(SQLException ex){throw new IllegalStateException("No se pudieron leer muestras",ex);}
                            }
                            public PosicionVista next(){
                                if(!hasNext())throw new NoSuchElementException();
                                try{var p=posicion(r);cargado=false;return p;}
                                catch(SQLException ex){throw new IllegalStateException("No se pudo leer muestra",ex);}
                            }
                        };
                        resumen=ResumenViajeCalculador.calcular(viaje,iterador);
                    }
                }
                c.commit();return new ViajeDetalle(viaje,resumen);
            }catch(SQLException|RuntimeException ex){
                try{c.rollback();}catch(SQLException rollback){ex.addSuppressed(rollback);}
                throw ex;
            }
        }catch(SQLException ex){throw new IllegalStateException("No se pudo consultar detalle",ex);}
    }
    Pagina<ViajeVista> listar(FiltroViajes f,ConsultaPagina p){
        rango(f.desde(),f.hasta());
        var clave=CursorViajes.decodificar(p.cursor(),"viajes",f,null,p.limit());
        StringBuilder sql=new StringBuilder("SELECT * FROM tb_viaje WHERE true");
        List<Object> args=new ArrayList<>();
        agregar(sql,args,"car_id = ?",f.carId());agregar(sql,args,"carrera_id = ?",f.carreraId());
        agregar(sql,args,"inicio_viaje_ts >= ?",f.desde());agregar(sql,args,"inicio_viaje_ts < ?",f.hasta());
        if(clave!=null){sql.append(" AND (inicio_viaje_ts,viaje_id) < (?,?)");args.add(clave.ts());args.add(clave.id());}
        sql.append(" ORDER BY inicio_viaje_ts DESC,viaje_id DESC LIMIT ?");args.add(p.limit()+1);
        try(var c=ds.getConnection();var s=c.prepareStatement(sql.toString())){
            bind(s,args);List<ViajeVista> rows=new ArrayList<>();
            try(var r=s.executeQuery()){while(r.next())rows.add(viaje(r));}
            String cursor=null;
            if(rows.size()>p.limit()){
                rows.remove(p.limit());var last=rows.get(rows.size()-1);
                cursor=CursorViajes.codificar("viajes",f,null,p.limit(),last.inicioViajeTs(),last.viajeId());
            }
            return new Pagina<>(rows,cursor);
        }catch(SQLException ex){throw new IllegalStateException("No se pudieron consultar viajes",ex);}
    }
    Pagina<PosicionVista> posiciones(UUID id,FiltroPosiciones f,ConsultaPagina p){
        rango(f.desde(),f.hasta());
        var clave=CursorViajes.decodificar(p.cursor(),"posiciones",f,id,p.limit());
        StringBuilder sql=new StringBuilder("SELECT * FROM tb_posicion_historial WHERE viaje_id=?");
        List<Object> args=new ArrayList<>();args.add(id);
        agregar(sql,args,"ts >= ?",f.desde());agregar(sql,args,"ts < ?",f.hasta());
        if(clave!=null){sql.append(" AND (ts,event_id) > (?,?)");args.add(clave.ts());args.add(clave.id());}
        sql.append(" ORDER BY ts,event_id LIMIT ?");args.add(p.limit()+1);
        try(var c=ds.getConnection()){
            obtener(c,id);
            try(var s=c.prepareStatement(sql.toString())){
                bind(s,args);List<PosicionVista> rows=new ArrayList<>();
                try(var r=s.executeQuery()){while(r.next())rows.add(posicion(r));}
                String cursor=null;
                if(rows.size()>p.limit()){
                    rows.remove(p.limit());var last=rows.get(rows.size()-1);
                    cursor=CursorViajes.codificar("posiciones",f,id,p.limit(),last.ts(),last.eventId());
                }
                return new Pagina<>(rows,cursor);
            }
        }catch(SQLException ex){throw new IllegalStateException("No se pudieron consultar muestras",ex);}
    }
    static ViajeVista obtener(Connection c,UUID id)throws SQLException{
        try(var s=c.prepareStatement("SELECT * FROM tb_viaje WHERE viaje_id=?")){
            s.setObject(1,id);try(var r=s.executeQuery()){if(!r.next())throw new ViajeNoEncontradoException();return viaje(r);}
        }
    }
    static ViajeVista viaje(ResultSet r)throws SQLException{
        return new ViajeVista(r.getObject("viaje_id",UUID.class),r.getObject("carrera_id",UUID.class),
            r.getString("car_id"),r.getString("ruta_id"),r.getString("company_id"),r.getString("fleet_id"),
            r.getLong("inicio_viaje_ts"),r.getObject("fin_ts",Long.class),EstadoViaje.valueOf(r.getString("estado")),
            r.getString("motivo_fin"),r.getLong("ultimo_ts"));
    }
    static PosicionVista posicion(ResultSet r)throws SQLException{
        return new PosicionVista(r.getObject("event_id",UUID.class),r.getObject("viaje_id",UUID.class),
            r.getString("tipo_evento"),r.getTimestamp("received_at").toInstant(),r.getString("car_id"),
            r.getString("company_id"),r.getString("fleet_id"),r.getDouble("lat"),r.getDouble("lon"),
            r.getInt("heading"),r.getString("engine"),r.getInt("battery"),r.getLong("ts"));
    }
    static void rango(Long desde,Long hasta){
        if((desde!=null&&desde<0)||(hasta!=null&&hasta<0)||(desde!=null&&hasta!=null&&desde>hasta))
            throw new ConsultaViajesInvalidaException();
    }
    private static void agregar(StringBuilder sql,List<Object> args,String condicion,Object valor){
        if(valor!=null){sql.append(" AND ").append(condicion);args.add(valor);}
    }
    private static void bind(PreparedStatement s,List<Object> args)throws SQLException{
        for(int i=0;i<args.size();i++)s.setObject(i+1,args.get(i));
    }
}
