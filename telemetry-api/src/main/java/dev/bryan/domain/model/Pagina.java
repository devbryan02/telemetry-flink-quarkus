package dev.bryan.domain.model;
public record Pagina<T>(java.util.List<T> items,String nextCursor) {}
