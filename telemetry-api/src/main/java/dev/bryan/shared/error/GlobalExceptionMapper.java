package dev.bryan.shared.error;

import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.UriInfo;
import org.jboss.logging.Logger;
import org.jboss.resteasy.reactive.RestResponse;
import org.jboss.resteasy.reactive.server.ServerExceptionMapper;

/** Manejador global de errores HTTP (STD-ERR-001): sin stack traces en la respuesta. */
class GlobalExceptionMapper {

    private static final Logger LOG = Logger.getLogger(GlobalExceptionMapper.class);

    @ServerExceptionMapper
    RestResponse<ErrorResponse> negocio(ComsatelException ex, UriInfo uri) {
        String requestId = ErrorResponse.nuevoRequestId();
        LOG.debugf("requestId=%s code=%s status=%d", requestId, ex.getCode(), ex.getStatus().getStatusCode());
        return respuesta(ErrorResponse.of(ex.getStatus().getStatusCode(), ex.getCode(), ex.getMessage(),
                uri.getPath(), requestId));
    }

    @ServerExceptionMapper
    RestResponse<ErrorResponse> http(WebApplicationException ex, UriInfo uri) {
        int status = ex.getResponse().getStatus();
        String requestId = ErrorResponse.nuevoRequestId();
        if (status >= 500) {
            LOG.errorf(ex, "requestId=%s status=%d", requestId, status);
            return interno(uri, requestId);
        }
        return respuesta(
                ErrorResponse.of(status, "HTTP_" + status, "La solicitud no es válida", uri.getPath(), requestId));
    }

    @ServerExceptionMapper
    RestResponse<ErrorResponse> inesperado(Throwable ex, UriInfo uri) {
        String requestId = ErrorResponse.nuevoRequestId();
        LOG.errorf(ex, "requestId=%s error no clasificado", requestId);
        return interno(uri, requestId);
    }

    private RestResponse<ErrorResponse> interno(UriInfo uri, String requestId) {
        return respuesta(
                ErrorResponse.of(500, "INTERNAL_ERROR", "Error interno del servidor", uri.getPath(), requestId));
    }

    private RestResponse<ErrorResponse> respuesta(ErrorResponse cuerpo) {
        return RestResponse.ResponseBuilder.<ErrorResponse>create(cuerpo.status()).entity(cuerpo).build();
    }
}
