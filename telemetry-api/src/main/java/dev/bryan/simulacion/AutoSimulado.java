package dev.bryan.simulacion;

import java.util.Random;

/**
 * Un auto que recorre una avenida de dos calzadas: avanza por la de ida, da media vuelta al final,
 * vuelve por la otra y así sucesivamente. Para de vez en cuando en semáforos y, en algunas paradas
 * largas, apaga el motor.
 */
final class AutoSimulado {

    /** Parámetros del comportamiento; en los tests se usan sin paradas para que sea determinista. */
    record Comportamiento(double semaforoCadaMetros, double probParada, double probApagar, double variacionKmh) {
        static final Comportamiento POR_DEFECTO = new Comportamiento(500, 0.6, 0.2, 3);
        static final Comportamiento SIN_PARADAS = new Comportamiento(500, 0, 0, 0);
    }

    private final String carId;
    private final String companyId;
    private final String fleetId;
    private final Ruta ida;
    private final Ruta vuelta;
    private final double velocidadBaseKmh;
    private final Comportamiento comportamiento;
    private final Random azar;

    private boolean enIda;
    private double recorrido;          // metros desde el inicio de la calzada actual
    private double proximoSemaforo;
    private double paradoSegundos;
    private boolean motorEncendido = true;
    private double velocidadKmh;
    private int bateria;

    AutoSimulado(Escenario.AutoInicial inicial, Ruta ida, Ruta vuelta, Comportamiento comportamiento, Random azar) {
        this.carId = inicial.carId();
        this.companyId = inicial.companyId();
        this.fleetId = inicial.fleetId();
        this.ida = ida;
        this.vuelta = vuelta;
        this.velocidadBaseKmh = inicial.velocidadKmh();
        this.velocidadKmh = inicial.velocidadKmh();
        this.comportamiento = comportamiento;
        this.azar = azar;
        this.enIda = !"vuelta".equals(inicial.sentido());
        this.recorrido = calzada().longitud() * Math.max(0, Math.min(1, inicial.inicio()));
        this.proximoSemaforo = siguienteSemaforo(recorrido);
        this.bateria = 60 + azar.nextInt(40);
    }

    /** Avanza el tiempo indicado. */
    void avanzar(double segundos) {
        if (paradoSegundos > 0) {
            paradoSegundos -= segundos;
            if (paradoSegundos <= 0) {
                motorEncendido = true;   // arranca de nuevo
            }
            return;
        }
        double variacion = comportamiento.variacionKmh();
        velocidadKmh = Math.max(15, Math.min(60, velocidadBaseKmh + (azar.nextDouble() * 2 - 1) * variacion));
        recorrido += velocidadKmh / 3.6 * segundos;

        if (recorrido >= proximoSemaforo && recorrido < calzada().longitud()) {
            proximoSemaforo = siguienteSemaforo(recorrido);
            if (azar.nextDouble() < comportamiento.probParada()) {
                recorrido = Math.min(recorrido, proximoSemaforo - comportamiento.semaforoCadaMetros());
                paradoSegundos = 5 + azar.nextDouble() * 10;
                if (azar.nextDouble() < comportamiento.probApagar()) {
                    motorEncendido = false;
                    paradoSegundos += 20;
                }
            }
        }
        if (recorrido >= calzada().longitud()) {   // fin de la calzada: media vuelta
            enIda = !enIda;
            recorrido = 0;
            proximoSemaforo = siguienteSemaforo(0);
        }
        if (azar.nextInt(30) == 0) {
            bateria = Math.max(5, bateria - 1);
        }
    }

    TelemetriaEvento evento(long ts) {
        Ruta.Punto p = calzada().posicionEn(recorrido);
        return new TelemetriaEvento(carId, companyId, fleetId,
                redondear(p.lat()), redondear(p.lon()), (int) Math.round(p.rumbo()) % 360,
                motorEncendido ? "ON" : "OFF", bateria, ts);
    }

    String carId() {
        return carId;
    }

    boolean enIda() {
        return enIda;
    }

    double recorrido() {
        return recorrido;
    }

    boolean detenido() {
        return paradoSegundos > 0;
    }

    private Ruta calzada() {
        return enIda ? ida : vuelta;
    }

    private double siguienteSemaforo(double desde) {
        double cada = comportamiento.semaforoCadaMetros();
        return (Math.floor(desde / cada) + 1) * cada;
    }

    private static double redondear(double grados) {
        return Math.round(grados * 1_000_000d) / 1_000_000d;
    }
}
