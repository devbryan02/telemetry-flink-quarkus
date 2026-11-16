# STD-ARCH-001: Arquitectura por features (frontend) y hexagonal (backend)

El **frontend** se organiza **por feature (capacidad de negocio)**, no por capa técnica: todo lo que necesita una feature vive junto en su carpeta. El **backend** sigue arquitectura hexagonal desde `ADR-006` (que reemplaza la antigua sección Backend de este estándar).

## Backend (Quarkus)

Ver [`ADR-006`](../adrs/ADR-006-arquitectura-hexagonal-backend.md): `domain/`, `application/` (`port/in`, `port/out`, `service`) e `infrastructure/` (`in`, `out`, `flink`). Resumen de reglas:
- Dependencias hacia adentro (`infrastructure` → `application` → `domain`); el núcleo no importa Quarkus, Vert.x, Flink ni JDBC.
- Las features no se llaman por dentro: se comunican por los topics `telemetria` y `ultima-posicion`, cada una con su propio record del evento.
- Los DTOs se escriben a mano como `record`; sin Lombok ni generadores.
- Las clases que se serializan en Flink viven en `infrastructure/flink`, sin CDI.
- `ArquitecturaHexagonalTest` (ArchUnit) hace cumplir la dirección de las dependencias.

## Frontend (Next.js)

```text
dashboard-next/
├── app/                    rutas (App Router); páginas delgadas que componen features
├── features/
│   └── autos/
│       ├── components/     autos-map.tsx, autos-layer.tsx, ruta-layer.tsx, salida-meta.tsx, carrera-panel.tsx
│       ├── hooks/          use-autos-socket.ts
│       ├── api.ts          llamadas axios de la feature (autos, rutas, carrera, velocidad)
│       ├── filtros.ts      filtro empresa → flota
│       ├── animacion.ts    interpolación del movimiento
│       ├── vehiculo.ts     íconos de vehículo
│       ├── types.ts        tipos Auto, ResumenRuta y EstadoSimulacion
│       └── index.ts        API pública de la feature
├── components/ui/          componentes shadcn/mapcn (generados por la CLI, compartidos)
└── lib/                    utilidades transversales (instancia axios, cn)
```

Reglas:
- `app/` solo importa desde `features/<x>` a través de su `index.ts`, nunca desde sus archivos internos.
- Una feature no importa los internos de otra feature.
- `components/ui/` contiene solo componentes genéricos, sin lógica de negocio.

## Prohibido

- Organizar el frontend por capa técnica (`controller/`, `service/`, `dto/`) en lugar de por feature.
- Generar DTOs con herramientas de generación de código.
- Acceder a los detalles internos de otra feature.
- Poner credenciales o secretos en el repositorio.
- Exponer excepciones internas al cliente (ver `STD-ERR-001`).

## Revisión

- ¿Se puede borrar o mover la feature cambiando un solo paquete o carpeta?
- ¿Las dependencias entre features pasan por un contrato explícito (topic o API pública)?
- ¿Cada puerto aísla I/O real o permite probar el núcleo sin infraestructura?
