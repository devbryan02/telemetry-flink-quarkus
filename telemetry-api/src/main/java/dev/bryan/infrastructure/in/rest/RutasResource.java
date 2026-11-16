package dev.bryan.infrastructure.in.rest;

import dev.bryan.application.port.in.ConsultarRutas;
import dev.bryan.domain.model.ResumenRuta;
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
    ConsultarRutas rutas;

    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public List<ResumenRuta> listar() {
        return rutas.listar();
    }

    @GET
    @Path("/{id}")
    @Produces("application/geo+json")
    public byte[] ruta(@PathParam("id") String id) {
        return rutas.geojson(id);
    }
}
