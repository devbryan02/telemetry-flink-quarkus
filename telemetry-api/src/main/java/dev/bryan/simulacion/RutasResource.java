package dev.bryan.simulacion;

import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import java.util.List;

/** Rutas de carrera disponibles y su geometría (GeoJSON, de la salida a la meta). */
@Path("/rutas")
public class RutasResource {

    @Inject
    CatalogoRutas catalogo;

    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public List<CatalogoRutas.Resumen> listar() {
        return catalogo.listar();
    }

    @GET
    @Path("/{id}")
    @Produces("application/geo+json")
    public byte[] ruta(@PathParam("id") String id) {
        return catalogo.geojson(id);
    }
}
