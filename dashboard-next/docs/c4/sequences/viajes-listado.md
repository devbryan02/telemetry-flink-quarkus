---
okf_version: 0.2
generated: 2026-11-16
verified: false
human-reviewed: false
status: REQUIRES_REVIEW
provenance: agent-generated
sources:
  - ../../../features/viajes/components/viajes-pantalla.tsx
  - ../../../features/viajes/hooks/use-carreras.ts
  - ../../../features/viajes/api.ts
  - ../../../features/viajes/carreras.ts
  - ../../../features/viajes/estado-carreras.ts
c4_level: Sequence
focus_id: viajes-pantalla
focus_name: ViajesPantalla
focus_kind: participant
focus_highlight: dark-red-700-border
component_path: dashboard-next
ui_route: "/viajes"
journey_provenance: EXTRACTED
---

# Secuencia · Viajes: carreras del día

**Pantalla o ruta:** `/viajes` · **Foco:** `ViajesPantalla` (borde dark red 700) · **procedencia:** `EXTRACTED` del código de `features/`.

```mermaid
%%{init: {'themeCSS': 'rect.actor{stroke:#616161;stroke-width:2px;} rect.actor[name="R"]{stroke:#B71C1C !important;stroke-width:4px !important;}'}}%%
sequenceDiagram
  participant U as Usuario
  participant R as ViajesPantalla · foco
  participant H as useCarreras
  participant A as viajes/api
  participant API as telemetry-api
  participant D as agruparPorCarrera
  U->>R: abre /viajes
  R->>H: useCarreras(fecha de hoy)
  H->>A: listarViajes con desde, hasta y limit 100
  A->>API: GET /viajes
  alt 200
    API-->>A: Pagina con items y nextCursor
    H->>A: obtenerResumenes de 6 en 6
    A->>API: GET /viajes/viajeId por cada viaje
    API-->>A: ViajeDetalle con el resumen
    H->>D: agrupa por carreraId y clasifica
    D-->>R: carreras con participantes
    R-->>U: tarjetas de carrera
  else 400 o fallo de red
    A-->>H: excepción de axios
    H-->>R: error
    R-->>U: No se pudieron cargar los viajes
  end
  R->>A: listarRutas()
  A->>API: GET /rutas
  R->>A: obtenerGeometria(rutaId) una vez por ruta presente
  A->>API: GET /rutas/id
  API-->>R: trazos para el mini mapa SVG
  opt hay una carrera EN_CURSO en la primera página
    loop cada 5 s
      H->>A: refresco de la primera página
      A->>API: GET /viajes y GET /viajes/viajeId
    end
  end
  opt el usuario pulsa Cargar más carreras
    U->>R: clic
    H->>A: listarViajes con cursor
    A->>API: GET /viajes con cursor
    API-->>H: siguiente página que se agrega
  end
  U->>R: cambia fecha, estado o ruta
  Note over R,H: la fecha cancela la carga anterior; estado y ruta filtran en el cliente
```

## Capas que atraviesa

| Capa | Elemento | Código |
|---|---|---|
| app (ruta) | app/viajes/page.tsx con `Suspense` | [`page.tsx`](../../../app/viajes/page.tsx) |
| features/viajes (componente) | ViajesPantalla y TarjetaCarrera | [`viajes-pantalla.tsx`](../../../features/viajes/components/viajes-pantalla.tsx) |
| features/viajes (hook) | useCarreras con `useReducer` y cancelación | [`use-carreras.ts`](../../../features/viajes/hooks/use-carreras.ts) |
| features/viajes (lógica pura) | agruparPorCarrera, reducirCarreras, rangoDelDia | [`carreras.ts`](../../../features/viajes/carreras.ts) |
| features/viajes (cliente HTTP) | listarViajes, obtenerResumenes, listarRutas, obtenerGeometria | [`api.ts`](../../../features/viajes/api.ts) |

## Llamadas a telemetry-api

| Método | Path | Función del cliente |
|---|---|---|
| GET | `/viajes` | `listarViajes` (límite de 100 por página; refresco cada 5 s si hay una carrera en curso) |
| GET | `/viajes/{viajeId}` | `obtenerResumenes` (de 6 en 6) |
| GET | `/rutas` | `listarRutas` |
| GET | `/rutas/{id}` | `obtenerGeometria` |

## Errores y estados relevantes

| Situación | Qué ve el usuario |
|---|---|
| fallo al cargar | `InlineNotification` `No se pudieron cargar los viajes` |
| fallo de `/rutas` o de una geometría | se ignora; la tarjeta queda sin mini mapa |
| sin resultados | `No hay carreras con estos filtros en la fecha elegida.` |
| respuesta de una solicitud anterior | el reductor la descarta: solo publica la última del día vigente |

## Pruebas que lo cubren

- [`carreras.test.ts`](../../../features/viajes/carreras.test.ts)
- [`estado-carreras.test.ts`](../../../features/viajes/estado-carreras.test.ts)
- [`presentacion.test.ts`](../../../features/viajes/presentacion.test.ts)

## Notas

- No hay BFF: el navegador llama a `telemetry-api` directamente con `axios` (`NEXT_PUBLIC_API_URL`) y al WebSocket con `WebSocket` nativo (`NEXT_PUBLIC_WS_URL`); no se envía ningún `correlation ID`.
- Sin autenticación ni sesión.

## Traceability

- Índice: [sequence-e2e.md](../sequence-e2e.md) · Diagrama: [`viajes-listado.mmd`](../diagrams/sequences/viajes-listado.mmd)
