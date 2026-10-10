# ADR-002: Nomenclatura de tablas de base de datos (`tb_<nombre>` en snake_case)

Toda tabla de base de datos se nombra `tb_<nombre>`, en `snake_case`, minúsculas y singular. Aplica a las migraciones Flyway y a las entities JPA.

- Ejemplos: `tb_access_policy`, `tb_policy_assignment`, `tb_policy_condition`, `tb_policy_schedule`, `tb_temporary_exception`, `tb_access_event`, `tb_policy_audit_event`.
- Columnas, índices (`idx_<tabla>_<columnas>`) y foreign keys (`fk_<tabla>_<referencia>`) también en `snake_case`.
- Toda entity JPA declara el nombre explícito: `@Table(name = "tb_<nombre>")`; nunca se depende de la estrategia de nombres por defecto de Hibernate.
- Los `REFERENCES` de las FKs y los `ALTER TABLE` de migraciones posteriores usan el nombre con prefijo `tb_`.
- Las consultas nativas (tests, seeds) deben usar los nombres `tb_*`; las `@Query` JPQL usan el nombre de la entidad y no cambian.