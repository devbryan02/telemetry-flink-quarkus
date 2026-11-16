package dev.bryan.domain.exception;

public final class ConsultaViajesInvalidaException extends NegocioException {
    public ConsultaViajesInvalidaException() {
        super(Tipo.SOLICITUD_INVALIDA, "CONSULTA_VIAJES_INVALIDA", "Parametros o cursor de viajes invalidos");
    }
}
