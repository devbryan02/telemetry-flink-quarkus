package dev.bryan.flink;

/**
 * Evento de telemetría tal como lo ve el job (spec §4). Es una copia propia del esquema:
 * la feature {@code flink} no depende de las clases de {@code autos}, solo del contrato JSON.
 * Debe ser un record público para que Flink lo serialice sin Kryo.
 */
public record Posicion(String carId, String companyId, String fleetId, double lat, double lon, int heading,
                       String engine, int battery, long ts) {
}
