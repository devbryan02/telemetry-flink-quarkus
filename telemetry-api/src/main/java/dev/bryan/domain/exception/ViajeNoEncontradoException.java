package dev.bryan.domain.exception;

public final class ViajeNoEncontradoException extends NegocioException {
    public ViajeNoEncontradoException() {
        super(Tipo.NO_ENCONTRADO, "VIAJE_NO_ENCONTRADO", "No existe el viaje solicitado");
    }
}
