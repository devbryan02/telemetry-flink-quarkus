package dev.bryan.viajes;
final class ViajeNoEncontradoException extends dev.bryan.shared.error.NegocioException {
    ViajeNoEncontradoException(){super(jakarta.ws.rs.core.Response.Status.NOT_FOUND,"VIAJE_NO_ENCONTRADO","No existe el viaje solicitado");}
}
