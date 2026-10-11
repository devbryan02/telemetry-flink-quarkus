# syntax=docker/dockerfile:1
# API Quarkus con Flink embebido: compila dentro de la imagen y corre el fast-jar sobre JRE 17.

FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /build
# Primero las dependencias (capa y caché de ~/.m2 reutilizables mientras no cambie el pom)
COPY pom.xml .
RUN --mount=type=cache,target=/root/.m2 mvn -B -q dependency:go-offline
COPY src ./src
# Los tests se corren aparte con ./mvnw test
RUN --mount=type=cache,target=/root/.m2 mvn -B -q package -DskipTests

FROM eclipse-temurin:17-jre
WORKDIR /app
RUN useradd --system --uid 1001 --home /app quarkus
COPY --from=build --chown=quarkus /build/target/quarkus-app/ /app/
USER quarkus
EXPOSE 8080 8081
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75 -Djava.util.logging.manager=org.jboss.logmanager.LogManager"
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/quarkus-run.jar"]
