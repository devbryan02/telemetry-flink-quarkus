package dev.bryan.simulacion;

/**
 * Un auto en carrera: avanza por la ruta a su velocidad (ajustable en cualquier momento) y al llegar a
 * la meta se detiene con el motor apagado y registra su tiempo.
 */
final class AutoCorredor {

    static final double VELOCIDAD_MINIMA_KMH = 10;
    static final double VELOCIDAD_MAXIMA_KMH = 500;

    private final java.util.UUID viajeId=java.util.UUID.randomUUID();
    java.util.UUID viajeId(){return viajeId;}
    private final String carId;
    private final String companyId;
    private final String fleetId;
    private final Ruta ruta;

    private double velocidadKmh;
    private double recorrido;          // metros desde la salida
    private Long llegadaMs;            // tiempo de carrera al cruzar la meta; null mientras corre

    AutoCorredor(Escenario.AutoInicial inicial, Ruta ruta, double velocidadKmh) {
        this.carId = inicial.carId();
        this.companyId = inicial.companyId();
        this.fleetId = inicial.fleetId();
        this.ruta = ruta;
        this.velocidadKmh = velocidadKmh;
    }

    static boolean velocidadValida(double kmh) {
        return kmh >= VELOCIDAD_MINIMA_KMH && kmh <= VELOCIDAD_MAXIMA_KMH;
    }

    /** Avanza `segundos`; `tiempoCarreraMs` es el tiempo transcurrido al final de este paso. */
    void avanzar(double segundos, long tiempoCarreraMs) {
        if (llego()) {
            return;
        }
        double antes = recorrido;
        recorrido += velocidadKmh / 3.6 * segundos;
        if (recorrido >= ruta.longitud()) {
            // interpola el instante exacto en que cruzó la meta dentro de este paso
            double fraccion = (ruta.longitud() - antes) / (recorrido - antes);
            llegadaMs = Math.round(tiempoCarreraMs - segundos * 1000 * (1 - fraccion));
            recorrido = ruta.longitud();
        }
    }

    void velocidad(double kmh) {
        if (!velocidadValida(kmh)) {
            throw new IllegalArgumentException("Velocidad fuera de rango: " + kmh);
        }
        this.velocidadKmh = kmh;
    }

    TelemetriaEvento evento(long ts) {
        Ruta.Punto p = ruta.posicionEn(recorrido);
        return new TelemetriaEvento(carId, companyId, fleetId,
                redondear(p.lat()), redondear(p.lon()), (int) Math.round(p.rumbo()) % 360,
                llego() ? "OFF" : "ON", 100, ts);
    }

    boolean llego() {
        return llegadaMs != null;
    }

    String carId() {
        return carId;
    }

    String companyId() {
        return companyId;
    }

    String fleetId() {
        return fleetId;
    }

    double velocidadKmh() {
        return velocidadKmh;
    }

    double recorrido() {
        return recorrido;
    }

    Long llegadaMs() {
        return llegadaMs;
    }

    private static double redondear(double grados) {
        return Math.round(grados * 1_000_000d) / 1_000_000d;
    }
}
