package dev.bryan.infrastructure.out.persistence.autos;

import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
class UltimaPosicionRepository implements PanacheRepositoryBase<UltimaPosicionEntity, String> {
}
