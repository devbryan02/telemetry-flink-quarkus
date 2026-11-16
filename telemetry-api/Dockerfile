# syntax=docker/dockerfile:1
# API Quarkus con Flink embebido: compila dentro de la imagen y corre el fast-jar sobre JRE 17.
# El fast-jar se copia por capas: lib/ (Flink, Kafka, Quarkus: cientos de MB y casi nunca cambian)
# queda en caché; un cambio de código solo reconstruye app/ y quarkus/.

FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /build
# Primero las dependencias (capa y caché de ~/.m2 reutilizables mientras no cambie el pom)
COPY pom.xml .
RUN --mount=type=cache,target=/root/.m2 mvn -B -q dependency:go-offline
COPY src ./src
# Los tests se corren aparte con ./mvnw test
RUN --mount=type=cache,target=/root/.m2 mvn -B -q package -DskipTests

FROM eclipse-temurin:17-jre-noble
WORKDIR /app
RUN useradd --system --uid 1001 --home /app quarkus
# De la capa más estable a la más cambiante
COPY --from=build --chown=quarkus /build/target/quarkus-app/lib/ ./lib/
COPY --from=build --chown=quarkus /build/target/quarkus-app/quarkus-run.jar ./
COPY --from=build --chown=quarkus /build/target/quarkus-app/quarkus/ ./quarkus/
COPY --from=build --chown=quarkus /build/target/quarkus-app/app/ ./app/
USER quarkus
EXPOSE 8080 8081
# ExitOnOutOfMemoryError: con `restart: unless-stopped` el contenedor se recupera solo en vez de quedar medio vivo.
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75 -XX:+ExitOnOutOfMemoryError -Djava.util.logging.manager=org.jboss.logmanager.LogManager"
HEALTHCHECK --interval=10s --timeout=5s --start-period=40s --retries=12 \
  CMD curl -fsS http://localhost:8080/q/health/ready > /dev/null || exit 1
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/quarkus-run.jar"]
