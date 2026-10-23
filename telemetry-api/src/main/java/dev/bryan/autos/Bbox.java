package dev.bryan.autos;

import dev.bryan.shared.error.NegocioException;
import jakarta.ws.rs.core.Response;

/** Caja geográfica {@code minLon,minLat,maxLon,maxLat} usada por {@code GET /autos?bbox=}. */
record Bbox(double minLon, double minLat, double maxLon, double maxLat) {

    static Bbox parse(String texto) {
        String[] partes = texto.split(",", -1);
        if (partes.length != 4) {
            throw invalido();
        }
        double[] v = new double[4];
        try {
            for (int i = 0; i < 4; i++) {
                v[i] = Double.parseDouble(partes[i].trim());
            }
        } catch (NumberFormatException e) {
            throw invalido();
        }
        boolean enRango = v[0] >= -180 && v[2] <= 180 && v[1] >= -90 && v[3] <= 90;
        if (!enRango || v[0] > v[2] || v[1] > v[3]) {
            throw invalido();
        }
        return new Bbox(v[0], v[1], v[2], v[3]);
    }

    boolean contiene(Auto auto) {
        return auto.lon() >= minLon && auto.lon() <= maxLon
                && auto.lat() >= minLat && auto.lat() <= maxLat;
    }

    private static NegocioException invalido() {
        return new NegocioException(Response.Status.BAD_REQUEST, "INVALID_BBOX",
                "bbox debe ser minLon,minLat,maxLon,maxLat con valores válidos");
    }
}
