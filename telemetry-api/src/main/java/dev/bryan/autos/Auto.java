package dev.bryan.autos;

/**
 * Evento de telemetría / última posición de un auto (spec §4).
 * {@code companyId} y {@code fleetId} son {@code null} en los autos particulares.
 */
public record Auto(String carId, String companyId, String fleetId, double lat, double lon, int heading,
                   String engine, int battery, long ts) {
}
