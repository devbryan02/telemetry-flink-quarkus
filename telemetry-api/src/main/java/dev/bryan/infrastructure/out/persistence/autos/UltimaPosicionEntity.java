package dev.bryan.infrastructure.out.persistence.autos;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;

/** Fila de {@code tb_ultima_posicion}: la última posición confirmada de cada auto. Detalle del adaptador. */
@Entity
@Table(name = "tb_ultima_posicion")
class UltimaPosicionEntity {
    @Id @Column(name = "car_id") String carId;
    @Column(name = "company_id") String companyId;
    @Column(name = "fleet_id") String fleetId;
    @Column(name = "lat") double lat;
    @Column(name = "lon") double lon;
    @Column(name = "heading") int heading;
    @Column(name = "engine") String engine;
    @Column(name = "battery") int battery;
    @Column(name = "ts") long ts;
    @Column(name = "schema_version") Integer schemaVersion;
    @Column(name = "event_id") UUID eventId;
    @Column(name = "carrera_id") UUID carreraId;
    @Column(name = "viaje_id") UUID viajeId;
    @Column(name = "ruta_id") String rutaId;
    @Column(name = "inicio_viaje_ts") Long inicioViajeTs;
    @Column(name = "tipo_evento") String tipoEvento;
    @Column(name = "motivo_fin") String motivoFin;
}
