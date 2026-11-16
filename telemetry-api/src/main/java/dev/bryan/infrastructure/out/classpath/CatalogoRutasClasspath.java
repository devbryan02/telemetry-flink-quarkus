package dev.bryan.infrastructure.out.classpath;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import dev.bryan.application.port.out.CatalogoRutas;
import dev.bryan.domain.exception.NegocioException;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;
import dev.bryan.domain.model.Escenario;
import dev.bryan.domain.model.ResumenRuta;
import dev.bryan.domain.model.Ruta;

/** Rutas de carrera (`resources/rutas/indice.json` y `*.geojson`) y escenarios (`resources/escenarios`). */
@ApplicationScoped
class CatalogoRutasClasspath implements CatalogoRutas {

    private static final Pattern NOMBRE_VALIDO = Pattern.compile("[a-z0-9-]{1,40}");

    @Inject
    ObjectMapper mapper;

    @Override public List<ResumenRuta> listar() {
        try (InputStream in = abrir("rutas/indice.json")) {
            return mapper.readValue(in, new TypeReference<List<ResumenRuta>>() {
            });
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    /** El GeoJSON de la ruta tal cual, para dibujarla en el dashboard. */
    @Override public byte[] geojson(String id) {
        try (InputStream in = abrir("rutas/" + validar(id) + ".geojson")) {
            return in.readAllBytes();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    /** La polilínea de la ruta en el sentido de la carrera (de la salida a la meta). */
    @Override public Ruta ruta(String id) {
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

    @Override public Escenario escenario(String nombre) {
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
        return new NegocioException(NegocioException.Tipo.NO_ENCONTRADO, "RUTA_NO_ENCONTRADA", "No existe la ruta " + nombre);
    }
}
