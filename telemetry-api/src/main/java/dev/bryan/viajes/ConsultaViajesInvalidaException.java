package dev.bryan.viajes;
final class ConsultaViajesInvalidaException extends dev.bryan.shared.error.ComsatelException {
    ConsultaViajesInvalidaException(){super(jakarta.ws.rs.core.Response.Status.BAD_REQUEST,"CONSULTA_VIAJES_INVALIDA","Parametros o cursor de viajes invalidos");}
}
