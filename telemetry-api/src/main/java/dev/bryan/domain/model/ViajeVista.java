package dev.bryan.domain.model;
public record ViajeVista(java.util.UUID viajeId,java.util.UUID carreraId,String carId,String rutaId,String companyId,String fleetId,long inicioViajeTs,Long finTs,EstadoViaje estado,String motivoFin,long ultimoTs) {}
