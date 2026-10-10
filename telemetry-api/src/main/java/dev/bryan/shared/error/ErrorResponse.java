package dev.bryan.shared.error;

import java.time.OffsetDateTime;
import java.util.UUID;

/** Contrato de error HTTP estable (STD-ERR-001). */
public record ErrorResponse(OffsetDateTime timestamp, int status, String code, String message,
                            String path, String requestId) {

    static ErrorResponse of(int status, String code, String message, String path, String requestId) {
        return new ErrorResponse(OffsetDateTime.now(), status, code, message, path, requestId);
    }

    static String nuevoRequestId() {
        return UUID.randomUUID().toString();
    }
}
