package dev.bryan.viajes;
import java.util.UUID;
record EventoViaje(String carId,String companyId,String fleetId,double lat,double lon,int heading,
    String engine,int battery,long ts,Integer schemaVersion,UUID eventId,UUID carreraId,UUID viajeId,
    String rutaId,Long inicioViajeTs,String tipoEvento,String motivoFin) {
    EventoViaje(String carId,String companyId,String fleetId,double lat,double lon,int heading,String engine,int battery,long ts) {
        this(carId,companyId,fleetId,lat,lon,heading,engine,battery,ts,null,null,null,null,null,null,null,null);
    }

}
