package dev.bryan.simulacion;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import dev.bryan.shared.error.NegocioException;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.core.Response;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

/** Rutas de carrera (`resources/rutas/indice.json` y `*.geojson`) y escenarios (`resources/escenarios`). */
@ApplicationScoped
class CatalogoRutas {

    private static final Pattern NOMBRE_VALIDO = Pattern.compile("[a-z0-9-]{1,40}");

    /** Resumen de una ruta para el selector del dashboard. */
    record Resumen(String id, String nombre, String desde, String hasta, double km) {
    }

    @Inject
    ObjectMapper mapper;

    List<Resumen> listar() {
        try (InputStream in = abrir("rutas/indice.json")) {
            return mapper.readValue(in, new TypeReference<List<Resumen>>() {
            });
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    Resumen resumen(String id) {
        return listar().stream().filter(r -> r.id().equals(id)).findFirst().orElseThrow(() -> noEncontrada(id));
    }

    /** El GeoJSON de la ruta tal cual, para dibujarla en el dashboard. */
    byte[] geojson(String id) {
        try (InputStream in = abrir("rutas/" + validar(id) + ".geojson")) {
            return in.readAllBytes();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    /** La polilínea de la ruta en el sentido de la carrera (de la salida a la meta). */
    Ruta ruta(String id) {
        try (InputStream in = abrir("rutas/" + validar(id) + ".geojson")) {
            JsonNode linea = mapper.readTree(in).path("features").path(0).path("geometry").path("coordinates");
            List<double[]> coordenadas = new ArrayList<>();
            for (JsonNode c : linea) {
                coordenadas.add(new double[] {c.get(0).asDouble(), c.get(1).asDouble()});
            }
            return new Ruta(coordenadas);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    Escenario escenario(String nombre) {
        try (InputStream in = abrir("escenarios/" + validar(nombre) + ".json")) {
            return mapper.readValue(in, Escenario.class);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    private static String validar(String nombre) {
        if (nombre == null || !NOMBRE_VALIDO.matcher(nombre).matches()) {
            throw noEncontrada(nombre);
        }
        return nombre;
    }

    private static InputStream abrir(String recurso) {
        InputStream in = Thread.currentThread().getContextClassLoader().getResourceAsStream(recurso);
        if (in == null) {
            throw noEncontrada(recurso);
        }
        return in;
    }

    private static NegocioException noEncontrada(String nombre) {
        return new NegocioException(Response.Status.NOT_FOUND, "RUTA_NO_ENCONTRADA", "No existe la ruta " + nombre);
    }
}
