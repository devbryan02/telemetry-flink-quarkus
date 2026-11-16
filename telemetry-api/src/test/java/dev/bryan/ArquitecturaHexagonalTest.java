package dev.bryan;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;

/** Hace cumplir ADR-006: las dependencias apuntan hacia adentro y las features solo se hablan por topics. */
@AnalyzeClasses(packages = "dev.bryan", importOptions = ImportOption.DoNotIncludeTests.class)
class ArquitecturaHexagonalTest {

    private static final String[] FRAMEWORKS = {
        "jakarta..", "io.quarkus..", "io.vertx..", "org.hibernate..", "io.smallrye..", "org.apache.flink..", "org.apache.kafka..",
        "java.sql..", "javax.sql..", "org.eclipse.microprofile..", "com.fasterxml.jackson..", "io.micrometer.."
    };

    @ArchTest
    static final ArchRule dominioNoDependeDeNada = noClasses().that().resideInAPackage("dev.bryan.domain..")
            .should().dependOnClassesThat().resideInAnyPackage("dev.bryan.application..", "dev.bryan.infrastructure..")
            .orShould().dependOnClassesThat().resideInAnyPackage(FRAMEWORKS)
            .as("domain no depende de application, infrastructure ni de frameworks");

    @ArchTest
    static final ArchRule aplicacionNoDependeDeInfraestructura = noClasses().that().resideInAPackage("dev.bryan.application..")
            .should().dependOnClassesThat().resideInAPackage("dev.bryan.infrastructure..")
            .orShould().dependOnClassesThat().resideInAnyPackage(FRAMEWORKS)
            .as("application no depende de infrastructure ni de frameworks");

    @ArchTest
    static final ArchRule entradaNoUsaSalida = noClasses().that().resideInAPackage("dev.bryan.infrastructure.in..")
            .should().dependOnClassesThat().resideInAPackage("dev.bryan.infrastructure.out..")
            .as("los adaptadores de entrada hablan con los casos de uso, no con los adaptadores de salida");

    @ArchTest
    static final ArchRule autosNoConoceViajes = noClasses().that().resideInAPackage("..autos..")
            .should().dependOnClassesThat().resideInAnyPackage("..viajes..", "..flink..")
            .as("autos solo se comunica con viajes y flink por topics de Kafka");

    @ArchTest
    static final ArchRule viajesNoConoceAutos = noClasses().that().resideInAPackage("..viajes..")
            .should().dependOnClassesThat().resideInAnyPackage("..autos..", "..flink..")
            .as("viajes solo se comunica con autos y flink por topics de Kafka");

    @ArchTest
    static final ArchRule flinkEsAutocontenido = noClasses().that().resideInAPackage("dev.bryan.infrastructure.flink..")
            .should().dependOnClassesThat().resideInAnyPackage("dev.bryan.domain..", "dev.bryan.application..",
                    "dev.bryan.infrastructure.in..", "dev.bryan.infrastructure.out..", "dev.bryan.infrastructure.config..")
            .as("los operadores de Flink se serializan: no dependen del núcleo ni de otros adaptadores");

    @ArchTest
    static final ArchRule hibernateSoloEnPersistencia = noClasses().that().resideOutsideOfPackage("dev.bryan.infrastructure.out.persistence..")
            .should().dependOnClassesThat().resideInAnyPackage("jakarta.persistence..", "org.hibernate..", "io.quarkus.hibernate..")
            .as("solo infrastructure.out.persistence conoce Hibernate y JPA (ADR-007)");
}
