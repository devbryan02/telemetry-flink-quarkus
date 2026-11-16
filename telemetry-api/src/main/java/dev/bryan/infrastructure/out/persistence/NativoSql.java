package dev.bryan.infrastructure.out.persistence;

import jakarta.persistence.Query;
import org.hibernate.type.BindableType;
import org.hibernate.query.NativeQuery;

/**
 * Parámetros tipados para SQL nativo. Un {@code null} sin tipo se enviaría como bytea y PostgreSQL lo rechaza
 * contra columnas uuid, bigint o integer; con el tipo explícito se envía como NULL del tipo correcto.
 */
public final class NativoSql {
    private NativoSql() {
    }

    public static <T> void parametro(Query consulta, int posicion, T valor, BindableType<T> tipo) {
        consulta.unwrap(NativeQuery.class).setParameter(posicion, valor, tipo);
    }
}
