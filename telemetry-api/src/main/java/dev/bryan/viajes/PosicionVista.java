package dev.bryan.viajes;
public record PosicionVista(java.util.UUID eventId,java.util.UUID viajeId,String tipoEvento,java.time.Instant receivedAt,String carId,String companyId,String fleetId,double lat,double lon,int heading,String engine,int battery,long ts) {}
