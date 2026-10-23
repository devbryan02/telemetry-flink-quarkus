package dev.bryan.simulacion;

import dev.bryan.shared.error.NegocioException;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

/** Control de la carrera desde el dashboard. */
@Path("/simulacion")
@Produces(MediaType.APPLICATION_JSON)
public class SimulacionResource {

    /** Cuerpo de {@code POST /simulacion/iniciar}. */
    public record Inicio(String ruta) {
    }

    /** Cuerpo de {@code PUT /simulacion/autos/{carId}/velocidad}. */
    public record Velocidad(Double kmh) {
    }

    @Inject
    Simulador simulador;

    @GET
    public Simulador.Estado estado() {
        return simulador.estado();
    }

    @POST
    @Path("/iniciar")
    @Consumes(MediaType.APPLICATION_JSON)
    public Simulador.Estado iniciar(Inicio cuerpo) {
        if (cuerpo == null || cuerpo.ruta() == null || cuerpo.ruta().isBlank()) {
            throw new NegocioException(Response.Status.BAD_REQUEST, "RUTA_REQUERIDA", "Indica la ruta de la carrera");
        }
        return simulador.iniciar(cuerpo.ruta());
    }

    @POST
    @Path("/detener")
    public Simulador.Estado detener() {
        return simulador.detener();
    }

    @PUT
    @Path("/autos/{carId}/velocidad")
    @Consumes(MediaType.APPLICATION_JSON)
    public Simulador.Estado velocidad(@PathParam("carId") String carId, Velocidad cuerpo) {
        if (cuerpo == null || cuerpo.kmh() == null) {
            throw new NegocioException(Response.Status.BAD_REQUEST, "VELOCIDAD_INVALIDA", "Indica la velocidad en km/h");
        }
        return simulador.velocidad(carId, cuerpo.kmh());
    }
}
