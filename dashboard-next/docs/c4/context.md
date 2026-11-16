---
okf_version: 0.2
generated: 2026-11-16
verified: true
human-reviewed: true
review_date: 2026-11-16
review_evidence: confirmacion expresa del responsable del repositorio en la sesion de Claude Code
status: READY_FOR_DEV
provenance: agent-generated
sources:
  - ../../../docker-compose.yml
  - ../../.env.example
  - ../../features/autos/hooks/use-estilos-mapa.ts
  - ../../components/ui/map.tsx
c4_level: Context
focus_id: dashboard-next
focus_name: dashboard-next
focus_kind: system
focus_highlight: dark-red-700-border
component_path: dashboard-next
---

# Contexto (C4 nivel 1)

**Foco:** `dashboard-next` (borde dark red 700).

## Diagrama

```mermaid
flowchart TB
  usuario["Usuario<br/>sigue y controla la carrera, revisa viajes<br/>y consulta la operación"]
  dash["dashboard-next<br/>Next.js 16 · React 19 · Carbon v12 · MapLibre"]
  api["telemetry-api<br/>REST /autos /rutas /simulacion /viajes /q/*<br/>y WebSocket /ws/autos"]
  of["OpenFreeMap<br/>estilo vectorial positron"]
  carto["CARTO Basemaps<br/>estilo de respaldo de mapcn"]
  flink["UI de Flink :8081<br/>enlace externo"]
  usuario -->|"navega por el navegador"| dash
  dash -->|"axios y WebSocket directos, sin BFF"| api
  dash -->|"GET del estilo y teselas desde el navegador"| of
  dash -.->|"solo si falla OpenFreeMap"| carto
  usuario -.->|"abre el enlace desde Operación"| flink
  classDef other fill:#ECEFF1,stroke:#616161,stroke-width:2px,color:#000
  classDef focus fill:#FFEBEE,stroke:#B71C1C,stroke-width:4px,color:#000
  class usuario,api,of,carto,flink other
  class dash focus
```

Fuente: [`diagrams/context.mmd`](diagrams/context.mmd).

## Elementos

| Elemento | Tipo | Rol | Procedencia |
|---|---|---|---|
| Usuario | Persona | Elige la ruta, inicia y detiene la carrera, ajusta velocidades, filtra por empresa y flota, revisa viajes y consulta la operación | `EXTRACTED` ([`autos-map.tsx`](../../features/autos/components/autos-map.tsx)) |
| `dashboard-next` | Sistema foco | Interfaz web de la carrera, los viajes y la operación | `EXTRACTED` |
| `telemetry-api` | Sistema externo | REST y WebSocket que alimentan todas las pantallas | `EXTRACTED` ([`lib/http.ts`](../../lib/http.ts), [`use-autos-socket.ts`](../../features/autos/hooks/use-autos-socket.ts)) |
| OpenFreeMap | Sistema externo | Estilo vectorial `positron` del mapa base, que el navegador recolorea con los grises de Carbon | `EXTRACTED` ([`use-estilos-mapa.ts`](../../features/autos/hooks/use-estilos-mapa.ts)) |
| CARTO Basemaps | Sistema externo | Estilo de respaldo que usa mapcn si falla OpenFreeMap | `EXTRACTED` ([`map.tsx`](../../components/ui/map.tsx)) |
| UI de Flink | Sistema externo | Enlace que abre la pantalla Operación en otra pestaña | `EXTRACTED` ([`operacion-pantalla.tsx`](../../features/operacion/components/operacion-pantalla.tsx)) |

## Límites y supuestos

- El pack cubre solo `dashboard-next`. Kafka, Flink y PostgreSQL no se relacionan con él directamente: llegan a través de `telemetry-api`.
- No hay autenticación ni sesión. El navegador necesita que `telemetry-api` permita su origen por CORS.
- Las URL de la API y del WebSocket son variables `NEXT_PUBLIC_*`: se incrustan al construir la imagen y las usa el navegador del host.

## Traceability

- Siguiente nivel: [container.md](container.md) · Resumen: [README.md](README.md)
