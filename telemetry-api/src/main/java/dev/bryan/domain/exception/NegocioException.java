package dev.bryan.domain.exception;

/**
 * Error de negocio con un tipo independiente de HTTP y un código estable (STD-ERR-001).
 * El adaptador REST traduce el {@link Tipo} al status correspondiente.
 */
public class NegocioException extends RuntimeException {

    /** Clase de error; el adaptador de entrada decide cómo se expresa (p. ej. 400 o 404). */
    public enum Tipo { SOLICITUD_INVALIDA, NO_ENCONTRADO }

    private final Tipo tipo;
    private final String code;

    public NegocioException(Tipo tipo, String code, String message) {
        super(message);
        this.tipo = tipo;
        this.code = code;
    }

    public Tipo getTipo() {
        return tipo;
    }

    public String getCode() {
        return code;
    }
}
