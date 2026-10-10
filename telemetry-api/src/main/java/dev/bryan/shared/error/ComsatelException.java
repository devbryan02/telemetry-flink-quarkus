package dev.bryan.shared.error;

import jakarta.ws.rs.core.Response;

/** Error de negocio con status HTTP y código estable (STD-ERR-001). */
public class ComsatelException extends RuntimeException {

    private final Response.Status status;
    private final String code;

    public ComsatelException(Response.Status status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }

    public Response.Status getStatus() {
        return status;
    }

    public String getCode() {
        return code;
    }
}
