package dev.bryan.domain.model;

import dev.bryan.domain.exception.ConsultaViajesInvalidaException;
public record ConsultaPagina(int limit,String cursor) {
    public ConsultaPagina { if(limit<1||limit>1000)throw new ConsultaViajesInvalidaException(); }
}
