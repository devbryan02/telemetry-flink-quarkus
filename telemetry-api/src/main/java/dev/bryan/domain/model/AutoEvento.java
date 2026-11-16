package dev.bryan.domain.model;
import java.util.UUID;
public record AutoEvento(String carId,String companyId,String fleetId,double lat,double lon,int heading,
    String engine,int battery,long ts,Integer schemaVersion,UUID eventId,UUID carreraId,UUID viajeId,
    String rutaId,Long inicioViajeTs,String tipoEvento,String motivoFin) {
    public AutoEvento(String carId,String companyId,String fleetId,double lat,double lon,int heading,String engine,int battery,long ts) {
        this(carId,companyId,fleetId,lat,lon,heading,engine,battery,ts,null,null,null,null,null,null,null,null);
    }
    public Auto auto() { return new Auto(carId,companyId,fleetId,lat,lon,heading,engine,battery,ts); }
}
