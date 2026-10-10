package dev.bryan.autos;

/** Evento de telemetría / última posición de un auto (spec §4). */
public record Auto(String carId, double lat, double lon, String engine, int battery, long ts) {
}
