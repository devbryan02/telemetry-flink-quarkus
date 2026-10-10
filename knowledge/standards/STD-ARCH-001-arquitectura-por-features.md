# STD-ARCH-001: Arquitectura por features

El código se organiza **por feature (capacidad de negocio)**, no por capa técnica. Todo lo que necesita una feature (recurso REST, WebSocket, consumidor Kafka, estado, modelos, lógica) vive junto en su paquete o carpeta.

## Backend (Quarkus)

```text
com.comsatel.telemetria
├── autos/                  feature: estado y difusión de la última posición
│   ├── Auto.java           record del evento (esquema de la spec §4)
│   ├── AutosStore.java     ConcurrentHashMap + set de "sucios"
│   ├── AutosConsumer.java  @Incoming ultima-posicion
│   ├── AutosResource.java  GET /autos
│   └── AutosWs.java        /ws/autos + @Scheduled 500 ms
├── flink/                  feature: job Flink embebido
│   ├── FlinkJobRunner.java
│   ├── UltimaPosicionJob.java
│   └── UltimaPosicionFunction.java
└── shared/                 solo lo transversal de verdad
    ├── error/              ComsatelException, GlobalExceptionMapper (ver STD-ERR-001)
    └── config/
```

Reglas:
- **Una feature = un paquete.** Las clases son *package-private* por defecto. Solo es `public` lo que otra feature o Quarkus necesita ver.
- **Las features no se llaman entre sí por dentro.** Si `flink` y `autos` necesitan comunicarse, lo hacen por un contrato explícito: un topic Kafka o una clase `public` documentada. Nunca se accede a los detalles internos de otra feature.
- **`shared/` es para lo transversal:** manejo de errores y configuración común. No es un cajón de sastre. Si algo solo lo usa una feature, va en esa feature.
- **Sin capas ceremoniales:** no se crean interfaces, puertos, mappers ni `service`/`repository` "por si acaso". Se introduce una abstracción solo cuando hay dos implementaciones reales o se necesita para probar.
- **Los DTOs se escriben a mano**, como `record` de Java, dentro de la feature que los expone. El contrato JSON es el de `docs/specs/telemetria.md` (§4 y §9).
- **Código Flink:** las clases que se serializan (funciones, esquemas) viven en `flink/`. No dependen de beans CDI ni de clases de otras features que no sean serializables.

## Frontend (Next.js)

```text
dashboard-next/
├── app/                    rutas (App Router); páginas delgadas que componen features
├── features/
│   └── autos/
│       ├── components/     autos-map.tsx, autos-stats.tsx
│       ├── hooks/          use-autos-socket.ts
│       ├── api.ts          llamadas axios de la feature
│       ├── types.ts        tipo Auto
│       └── index.ts        API pública de la feature
├── components/ui/          componentes shadcn/mapcn (generados por la CLI, compartidos)
└── lib/                    utilidades transversales (instancia axios, cn)
```

Reglas:
- `app/` solo importa desde `features/<x>` a través de su `index.ts`, nunca desde sus archivos internos.
- Una feature no importa los internos de otra feature.
- `components/ui/` contiene solo componentes genéricos, sin lógica de negocio.

## Prohibido

- Organizar por capa técnica (`controller/`, `service/`, `repository/`, `dto/`) en la raíz del proyecto.
- Generar DTOs con herramientas de generación de código.
- Acceder a los detalles internos de otra feature.
- Poner credenciales o secretos en el repositorio.
- Exponer excepciones internas al cliente (ver `STD-ERR-001`).

## Revisión

- ¿Se puede borrar o mover la feature cambiando un solo paquete o carpeta?
- ¿Las dependencias entre features pasan por un contrato explícito (topic o API pública)?
- ¿Cada abstracción tiene más de una implementación o una razón de prueba concreta?
