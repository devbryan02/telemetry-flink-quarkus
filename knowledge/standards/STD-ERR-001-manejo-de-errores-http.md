# STD-ERR-001: Manejo de errores HTTP

Contrato de error estable:

```json
{
  "timestamp": "2026-09-17T08:35:21-05:00",
  "status": 400,
  "code": "INVALID_REQUEST",
  "message": "La solicitud no es válida",
  "path": "/api/v1/<recurso>",
  "requestId": "8c9d..."
}
```

Sin stack trace en la respuesta. `requestId` correlaciona con logs.

## Excepciones de negocio

Clase base `ComsatelException` (`shared/error/`, ver `STD-ARCH-001`) con `status` HTTP + `code`; subclases concretas por caso, nunca se lanza la base directamente. Stack Quarkus (ver `ADR-003`): se usa `jakarta.ws.rs.core.Response.Status`, no tipos de Spring.

```java
package com.comsatel.telemetria.shared.error;

import jakarta.ws.rs.core.Response;

public class ComsatelException extends RuntimeException {
    private final Response.Status status;
    private final String code;

    public ComsatelException(Response.Status status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }

    public Response.Status getStatus() { return status; }
    public String getCode() { return code; }
}
```

```java
public class <Entidad>NotFoundException extends ComsatelException {
    public <Entidad>NotFoundException(String message) {
        super(Response.Status.NOT_FOUND, "<ENTIDAD>_NOT_FOUND", message);
    }
}
```

`code` en mayúsculas/snake_case, estable — forma parte del contrato de error.

## 400 vs 500

- **400**: parámetro ausente/inválido, filtro fuera de rango, deserialización fallida, violación de validación del contrato. Mensaje orientado al consumidor, sin detalle interno.
- **500**: dependencia externa no disponible, timeout, fallo de acceso a datos, error de mapeo, excepción no clasificada. Cliente recibe mensaje genérico; log interno con causa técnica, `requestId`, duración.

## Traducción de excepciones

Manejador global único. En Quarkus REST: una clase con métodos `@ServerExceptionMapper` (o `ExceptionMapper<T>` + `@Provider`):

```java
public class GlobalExceptionMapper {
    @ServerExceptionMapper
    public RestResponse<ErrorResponse> map(ComsatelException ex, UriInfo uri) {
        return RestResponse.status(ex.getStatus(), ErrorResponse.of(ex, uri.getPath()));
    }
}
```

Reglas:

- `ComsatelException` y subclases se mapean directo (ya traen `status`/`code`).
- Validación → 400. Excepciones de adaptadores de salida → 500 técnico. No clasificadas → `INTERNAL_ERROR`.
- No capturar `Exception` de forma dispersa en cada método.

## Seguridad

Nunca exponer en HTTP ni en logs públicos: queries/comandos sensibles, passwords/tokens/connection strings, stack traces, configuración interna, topología de infraestructura.

## Logging

Por operación: nombre, `requestId`, `duration`, `resultCount`, `status`, excepción clasificada sin secretos. 400 con severidad baja; 500 y fallos externos deben permitir alertas.

## Pruebas mínimas

Request inválido → 400 sin stack trace. Dependencia no disponible/timeout → 500 sin URLs ni credenciales. Excepción inesperada → 500 genérico. `requestId` presente. Comparar contra el contrato JSON de la spec.
