package dev.bryan.viajes;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import io.smallrye.common.annotation.Blocking;
import java.util.UUID;
@Path("/viajes")
@Produces(MediaType.APPLICATION_JSON)
@Blocking
public class ViajesResource {
    @Inject ViajesConsulta consulta;
    @GET public Pagina<ViajeVista> listar(@QueryParam("carId")String carId,@QueryParam("carreraId")String carrera,
        @QueryParam("desde")String desde,@QueryParam("hasta")String hasta,@QueryParam("limit")String limit,@QueryParam("cursor")String cursor){
        return consulta.listar(new FiltroViajes(carId==null||carId.isBlank()?null:carId,uuid(carrera),numero(desde),numero(hasta)),pagina(limit,cursor));
    }
    @GET @Path("/{viajeId}/posiciones") public Pagina<PosicionVista> posiciones(@PathParam("viajeId")String viaje,
        @QueryParam("desde")String desde,@QueryParam("hasta")String hasta,@QueryParam("limit")String limit,@QueryParam("cursor")String cursor){
        return consulta.posiciones(uuid(viaje),new FiltroPosiciones(numero(desde),numero(hasta)),pagina(limit,cursor));
    }
    static UUID uuid(String s){
        if(s==null)return null;
        try{
            if(!s.matches("[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"))throw new IllegalArgumentException();
            return UUID.fromString(s);
        }catch(IllegalArgumentException ex){throw new ConsultaViajesInvalidaException();}
    }
    static Long numero(String s){
        try{return s==null?null:Long.valueOf(s);}
        catch(NumberFormatException ex){throw new ConsultaViajesInvalidaException();}
    }
    static ConsultaPagina pagina(String limit,String cursor){
        try{return new ConsultaPagina(limit==null?100:Integer.parseInt(limit),cursor);}
        catch(NumberFormatException ex){throw new ConsultaViajesInvalidaException();}
    }
}
