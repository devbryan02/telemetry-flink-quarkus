package dev.bryan.infrastructure.in.rest;

import dev.bryan.application.port.in.GestionarSimulacion;
import dev.bryan.domain.exception.NegocioException;
import dev.bryan.domain.model.EstadoSimulacion;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;

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
    GestionarSimulacion simulacion;

    @GET
    public EstadoSimulacion estado() {
        return simulacion.estado();
    }

    @POST
    @Path("/iniciar")
    @Consumes(MediaType.APPLICATION_JSON)
    public EstadoSimulacion iniciar(Inicio cuerpo) {
        if (cuerpo == null || cuerpo.ruta() == null || cuerpo.ruta().isBlank()) {
            throw new NegocioException(NegocioException.Tipo.SOLICITUD_INVALIDA, "RUTA_REQUERIDA", "Indica la ruta de la carrera");
        }
        return simulacion.iniciar(cuerpo.ruta());
    }

    @POST
    @Path("/detener")
    public EstadoSimulacion detener() {
        return simulacion.detener();
    }

    @PUT
    @Path("/autos/{carId}/velocidad")
    @Consumes(MediaType.APPLICATION_JSON)
    public EstadoSimulacion velocidad(@PathParam("carId") String carId, Velocidad cuerpo) {
        if (cuerpo == null || cuerpo.kmh() == null) {
            throw new NegocioException(NegocioException.Tipo.SOLICITUD_INVALIDA, "VELOCIDAD_INVALIDA", "Indica la velocidad en km/h");
        }
        return simulacion.velocidad(carId, cuerpo.kmh());
    }
}
