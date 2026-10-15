package dev.bryan.autos;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import javax.sql.DataSource;
import java.sql.*;
import java.util.*;

@ApplicationScoped
class AutosStore {
    @Inject DataSource dataSource;
    List<Auto> guardarLote(List<AutoEvento> lote) {
        Map<String,AutoEvento> ultimos=new TreeMap<>();
        for(var evento:lote) ultimos.merge(evento.carId(),evento,(a,b)->a.ts()>=b.ts()?a:b);
        try(var c=dataSource.getConnection()) {
            c.setAutoCommit(false);
            try {
                List<Auto> cambios=new ArrayList<>();
                try(var s=c.prepareStatement("""
                    INSERT INTO tb_ultima_posicion(car_id,company_id,fleet_id,lat,lon,heading,engine,battery,ts)
                    VALUES(?,?,?,?,?,?,?,?,?)
                    ON CONFLICT(car_id) DO UPDATE SET
                    company_id=excluded.company_id,fleet_id=excluded.fleet_id,lat=excluded.lat,lon=excluded.lon,
                    heading=excluded.heading,engine=excluded.engine,battery=excluded.battery,ts=excluded.ts
                    WHERE excluded.ts > tb_ultima_posicion.ts RETURNING *
                    """)) {
                    for(var e:ultimos.values()) {
                        s.setString(1,e.carId());s.setString(2,e.companyId());s.setString(3,e.fleetId());
                        s.setDouble(4,e.lat());s.setDouble(5,e.lon());s.setInt(6,e.heading());
                        s.setString(7,e.engine());s.setInt(8,e.battery());s.setLong(9,e.ts());
                        try(var rs=s.executeQuery()) { if(rs.next()) cambios.add(auto(rs)); }
                    }
                }
                c.commit();
                return cambios;
            } catch(Exception ex) { c.rollback();throw ex; }
        } catch(SQLException ex) {throw new IllegalStateException("No se pudieron persistir posiciones",ex);}
    }
    List<Auto> todos() { return consultar(null); }
    List<Auto> enBbox(Bbox bbox) { return consultar(bbox); }
    int tamanio() {
        try(var c=dataSource.getConnection();var s=c.createStatement();var rs=s.executeQuery("SELECT count(*) FROM tb_ultima_posicion")) {
            rs.next();return rs.getInt(1);
        }catch(SQLException ex){throw new IllegalStateException("No se pudieron contar posiciones",ex);}
    }
    private List<Auto> consultar(Bbox b) {
        String sql="SELECT * FROM tb_ultima_posicion"+(b==null?"":" WHERE lon>=? AND lat>=? AND lon<=? AND lat<=?")+" ORDER BY car_id";
        try(var c=dataSource.getConnection();var s=c.prepareStatement(sql)) {
            if(b!=null){s.setDouble(1,b.minLon());s.setDouble(2,b.minLat());s.setDouble(3,b.maxLon());s.setDouble(4,b.maxLat());}
            try(var rs=s.executeQuery()){
                List<Auto> autos=new ArrayList<>();while(rs.next())autos.add(auto(rs));return autos;
            }
        }catch(SQLException ex){throw new IllegalStateException("No se pudieron consultar posiciones",ex);}
    }
    private static Auto auto(ResultSet r)throws SQLException{
        return new Auto(r.getString("car_id"),r.getString("company_id"),r.getString("fleet_id"),
            r.getDouble("lat"),r.getDouble("lon"),r.getInt("heading"),r.getString("engine"),r.getInt("battery"),r.getLong("ts"));
    }
}
