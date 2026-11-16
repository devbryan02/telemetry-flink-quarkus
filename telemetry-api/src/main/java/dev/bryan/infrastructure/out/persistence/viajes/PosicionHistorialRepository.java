package dev.bryan.infrastructure.out.persistence.viajes;

import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.UUID;

@ApplicationScoped
class PosicionHistorialRepository implements PanacheRepositoryBase<PosicionHistorialEntity, UUID> {
}
