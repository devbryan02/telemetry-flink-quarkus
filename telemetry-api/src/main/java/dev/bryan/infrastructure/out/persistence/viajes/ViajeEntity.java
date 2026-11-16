package dev.bryan.infrastructure.out.persistence.viajes;

import dev.bryan.domain.model.EstadoViaje;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;

/** Fila de {@code tb_viaje}. Detalle del adaptador. */
@Entity
@Table(name = "tb_viaje")
class ViajeEntity {
    @Id @Column(name = "viaje_id") UUID viajeId;
    @Column(name = "carrera_id") UUID carreraId;
    @Column(name = "car_id") String carId;
    @Column(name = "ruta_id") String rutaId;
    @Column(name = "company_id") String companyId;
    @Column(name = "fleet_id") String fleetId;
    @Column(name = "inicio_viaje_ts") long inicioViajeTs;
    @Column(name = "fin_ts") Long finTs;
    @Column(name = "ultimo_ts") long ultimoTs;
    @Enumerated(EnumType.STRING) @Column(name = "estado") EstadoViaje estado;
    @Column(name = "motivo_fin") String motivoFin;
}
