package dev.bryan.simulacion;

/**
 * Evento que la simulación publica en {@code telemetria} (spec §4). Es una copia propia del contrato:
 * la feature no depende de las clases de {@code autos} ni de {@code flink}.
 */
record TelemetriaEvento(String carId, String companyId, String fleetId, double lat, double lon, int heading,
                        String engine, int battery, long ts) {
}
