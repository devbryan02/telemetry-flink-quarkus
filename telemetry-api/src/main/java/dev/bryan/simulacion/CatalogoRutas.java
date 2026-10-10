package dev.bryan.simulacion;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import dev.bryan.shared.error.ComsatelException;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.core.Response;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

/** Lee las rutas (`resources/rutas/*.geojson`) y los escenarios (`resources/escenarios/*.json`). */
@ApplicationScoped
class CatalogoRutas {

    private static final Pattern NOMBRE_VALIDO = Pattern.compile("[a-z0-9-]{1,40}");

    /** Las dos calzadas de una avenida, cada una en su sentido de circulación. */
    record Calzadas(Ruta ida, Ruta vuelta) {
    }

    @Inject
    ObjectMapper mapper;

    /** El GeoJSON de la ruta tal cual, para dibujarla en el dashboard. */
    byte[] geojson(String nombre) {
        try (InputStream in = abrir("rutas/" + validar(nombre) + ".geojson")) {
            return in.readAllBytes();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    Calzadas calzadas(String nombre) {
        try (InputStream in = abrir("rutas/" + validar(nombre) + ".geojson")) {
            JsonNode raiz = mapper.readTree(in);
            Ruta ida = null;
            Ruta vuelta = null;
            for (JsonNode feature : raiz.path("features")) {
                List<double[]> coordenadas = new ArrayList<>();
                for (JsonNode c : feature.path("geometry").path("coordinates")) {
                    coordenadas.add(new double[] {c.get(0).asDouble(), c.get(1).asDouble()});
                }
                String sentido = feature.path("properties").path("sentido").asText();
                if ("ida".equals(sentido)) {
                    ida = new Ruta(coordenadas);
                } else if ("vuelta".equals(sentido)) {
                    vuelta = new Ruta(coordenadas);
                }
            }
            if (ida == null || vuelta == null) {
                throw new IllegalStateException("La ruta " + nombre + " necesita las calzadas 'ida' y 'vuelta'");
            }
            return new Calzadas(ida, vuelta);
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

    private static ComsatelException noEncontrada(String nombre) {
        return new ComsatelException(Response.Status.NOT_FOUND, "RUTA_NO_ENCONTRADA", "No existe la ruta o escenario " + nombre);
    }
}
