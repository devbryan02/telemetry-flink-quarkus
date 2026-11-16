package dev.bryan.infrastructure.in.rest;

import dev.bryan.application.port.in.ConsultarAutos;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import java.util.List;
import dev.bryan.domain.model.Auto;
import dev.bryan.domain.model.Bbox;

@Path("/autos")
@io.smallrye.common.annotation.Blocking
@Produces(MediaType.APPLICATION_JSON)
public class AutosResource {

    @Inject
    ConsultarAutos autos;

    /** Estado completo, o solo los autos dentro de {@code bbox=minLon,minLat,maxLon,maxLat}. */
    @GET
    public List<Auto> listar(@QueryParam("bbox") String bbox) {
        if (bbox == null || bbox.isBlank()) {
            return autos.todos();
        }
        return autos.enBbox(Bbox.parse(bbox));
    }
}
