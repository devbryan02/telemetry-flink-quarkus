package dev.bryan.application.port.out;

/** Ejecución periódica; la implementación decide el mecanismo (Vert.x: `@Scheduled` solo evalúa cada 1 s). */
public interface Temporizador {
    /** @return identificador para {@link #cancelar(long)} */
    long cadaMs(long periodoMs, Runnable tarea);

    void cancelar(long id);
}
