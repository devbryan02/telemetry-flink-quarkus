package dev.bryan.autos;

import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import java.util.List;

@Path("/autos")
@Produces(MediaType.APPLICATION_JSON)
public class AutosResource {

    @Inject
    AutosStore store;

    /** Estado completo, o solo los autos dentro de {@code bbox=minLon,minLat,maxLon,maxLat}. */
    @GET
    public List<Auto> listar(@QueryParam("bbox") String bbox) {
        if (bbox == null || bbox.isBlank()) {
            return store.todos();
        }
        return store.enBbox(Bbox.parse(bbox));
    }
}
