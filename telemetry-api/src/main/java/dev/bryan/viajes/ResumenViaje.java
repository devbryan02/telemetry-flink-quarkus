package dev.bryan.viajes;
public record ResumenViaje(long cantidadMuestras,long ultimoTs,long duracionObservadaMs,Long duracionViajeMs,
    double distanciaObservadaM,Double velocidadMediaObservadaKmh,long maxIntervaloMuestrasMs) {}
