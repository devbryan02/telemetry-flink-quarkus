package dev.bryan.simulacion;

import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;

/** Geometría de las rutas simuladas (GeoJSON con las calzadas de ida y vuelta) para dibujarlas. */
@Path("/rutas")
public class RutasResource {

    @Inject
    CatalogoRutas catalogo;

    @GET
    @Path("/{nombre}")
    @Produces("application/geo+json")
    public byte[] ruta(@PathParam("nombre") String nombre) {
        return catalogo.geojson(nombre);
    }
}
