# STD-GIT-001: Git Flow y ramas de features (genérico)

## Ramas

- `main`, `develop`, `feature/<ticket>-<descripcion>` (desde `develop`); `release/<version>`/`hotfix/<ticket>-<descripcion>` solo si el equipo los usa.
- Nombres cortos en minúsculas: `feature/<TICKET>-<slug-corto>`.

## Flujo

1. Crear la rama de feature desde `develop`.
2. Implementar y probar localmente.
3. Commits con Conventional Commits (`feat`, `fix`, `test`, `docs`...), sin secretos ni archivos temporales.
4. Actualizar con `develop` cuando sea necesario.

Sin Pull Request ni Merge Request — el flujo termina en el commit a la rama de feature.

## Conflictos

Resolver en la rama de feature (nunca en `develop`) y volver a correr las pruebas tras resolver. No usar operaciones destructivas para ocultarlos.

## Definition of Done

Compila, tiene pruebas automatizadas, no viola `STD-ARCH-001`, sin secretos, documenta las decisiones necesarias (ADR si aplica). Si cambia el contrato de API: pruebas funcionales pasan y las de carga afectadas fueron revisadas.
