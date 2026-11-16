package dev.bryan.infrastructure.out.persistence.viajes;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** Fila de {@code tb_posicion_historial}. Solo se lee con Hibernate; las altas son SQL nativo idempotente. */
@Entity
@Table(name = "tb_posicion_historial")
class PosicionHistorialEntity {
    @Id @Column(name = "event_id") UUID eventId;
    @Column(name = "viaje_id") UUID viajeId;
    @Column(name = "schema_version") int schemaVersion;
    @Column(name = "carrera_id") UUID carreraId;
    @Column(name = "ruta_id") String rutaId;
    @Column(name = "inicio_viaje_ts") long inicioViajeTs;
    @Column(name = "tipo_evento") String tipoEvento;
    @Column(name = "motivo_fin") String motivoFin;
    @Column(name = "car_id") String carId;
    @Column(name = "company_id") String companyId;
    @Column(name = "fleet_id") String fleetId;
    @Column(name = "lat") double lat;
    @Column(name = "lon") double lon;
    @Column(name = "heading") int heading;
    @Column(name = "engine") String engine;
    @Column(name = "battery") int battery;
    @Column(name = "ts") long ts;
    @Column(name = "received_at", insertable = false, updatable = false) Instant receivedAt;
}
