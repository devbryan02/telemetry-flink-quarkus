package dev.bryan.application.port.in;

import dev.bryan.domain.model.EstadoSimulacion;

/** Control de la carrera: iniciar, detener, cambiar la velocidad de un auto y consultar la clasificación. */
public interface GestionarSimulacion {
    EstadoSimulacion estado();

    /** Nueva carrera en la ruta indicada. Si había una en curso, la reemplaza. */
    EstadoSimulacion iniciar(String idRuta);

    /** Detiene la carrera; los autos quedan donde están. */
    EstadoSimulacion detener();

    /** Cambia la velocidad de un auto, también en plena carrera. */
    EstadoSimulacion velocidad(String carId, double kmh);

    /** Cierra los viajes abiertos y espera las publicaciones pendientes al apagar la aplicación. */
    void apagar();
}
