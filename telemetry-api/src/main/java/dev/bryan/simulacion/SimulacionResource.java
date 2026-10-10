package dev.bryan.simulacion;

import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;

/** Control de la simulación desde el dashboard. */
@Path("/simulacion")
@Produces(MediaType.APPLICATION_JSON)
public class SimulacionResource {

    @Inject
    Simulador simulador;

    @GET
    public Simulador.Estado estado() {
        return simulador.estado();
    }

    @POST
    @Path("/iniciar")
    public Simulador.Estado iniciar() {
        return simulador.iniciar();
    }

    @POST
    @Path("/detener")
    public Simulador.Estado detener() {
        return simulador.detener();
    }
}
