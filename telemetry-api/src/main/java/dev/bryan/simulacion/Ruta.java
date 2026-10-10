package dev.bryan.simulacion;

import java.util.List;

/**
 * Polilínea de una calzada (en su sentido de circulación) con las distancias acumuladas, para
 * ubicar un auto a una distancia dada desde el inicio.
 */
final class Ruta {

    private static final double METROS_POR_GRADO = 111_320.0;

    /** Posición sobre la ruta: coordenadas y rumbo del tramo (grados desde el norte, sentido horario). */
    record Punto(double lat, double lon, double rumbo) {
    }

    private final double[] lat;
    private final double[] lon;
    private final double[] acumulado;

    /** @param coordenadas pares [lon, lat] en el sentido de circulación, como en GeoJSON */
    Ruta(List<double[]> coordenadas) {
        if (coordenadas.size() < 2) {
            throw new IllegalArgumentException("Una ruta necesita al menos 2 puntos");
        }
        int n = coordenadas.size();
        lat = new double[n];
        lon = new double[n];
        acumulado = new double[n];
        for (int i = 0; i < n; i++) {
            lon[i] = coordenadas.get(i)[0];
            lat[i] = coordenadas.get(i)[1];
            if (i > 0) {
                acumulado[i] = acumulado[i - 1] + metros(i - 1, i);
            }
        }
    }

    double longitud() {
        return acumulado[acumulado.length - 1];
    }

    /** Posición a `metros` del inicio; fuera del rango se ajusta a los extremos. */
    Punto posicionEn(double metros) {
        double d = Math.max(0, Math.min(metros, longitud()));
        int i = 1;
        while (i < acumulado.length - 1 && acumulado[i] < d) {
            i++;
        }
        double largoTramo = acumulado[i] - acumulado[i - 1];
        double f = largoTramo == 0 ? 0 : (d - acumulado[i - 1]) / largoTramo;
        return new Punto(
                lat[i - 1] + (lat[i] - lat[i - 1]) * f,
                lon[i - 1] + (lon[i] - lon[i - 1]) * f,
                rumbo(i - 1, i));
    }

    private double metros(int a, int b) {
        double dy = (lat[b] - lat[a]) * METROS_POR_GRADO;
        double dx = (lon[b] - lon[a]) * METROS_POR_GRADO * Math.cos(Math.toRadians(lat[a]));
        return Math.hypot(dx, dy);
    }

    private double rumbo(int a, int b) {
        double dy = lat[b] - lat[a];
        double dx = (lon[b] - lon[a]) * Math.cos(Math.toRadians(lat[a]));
        double grados = Math.toDegrees(Math.atan2(dx, dy));
        return (grados + 360) % 360;
    }
}
