package dev.bryan.flink;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import org.apache.flink.api.common.serialization.DeserializationSchema;
import org.apache.flink.api.common.serialization.SerializationSchema;
import org.apache.flink.api.common.typeinfo.TypeInformation;

/** (De)serialización JSON de {@link Posicion} para el source y el sink Kafka del job. */
final class PosicionJson {

    private PosicionJson() {
    }

    /** Un mensaje inválido se descarta (devuelve {@code null}) en lugar de tumbar el job. */
    static class Deserializador implements DeserializationSchema<Posicion> {

        private transient ObjectMapper mapper;

        @Override
        public Posicion deserialize(byte[] mensaje) {
            if (mapper == null) {
                // Tolerante a cambios del contrato: campos extra se ignoran y los que faltan quedan en null/0
                mapper = new ObjectMapper().configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
            }
            try {
                return mapper.readValue(mensaje, Posicion.class);
            } catch (IOException e) {
                return null;
            }
        }

        @Override
        public boolean isEndOfStream(Posicion siguiente) {
            return false;
        }

        @Override
        public TypeInformation<Posicion> getProducedType() {
            return TypeInformation.of(Posicion.class);
        }
    }

    static class Serializador implements SerializationSchema<Posicion> {

        private transient ObjectMapper mapper;

        @Override
        public byte[] serialize(Posicion posicion) {
            if (mapper == null) {
                mapper = new ObjectMapper();
            }
            try {
                return mapper.writeValueAsBytes(posicion);
            } catch (IOException e) {
                throw new IllegalStateException("No se pudo serializar la posición de " + posicion.carId(), e);
            }
        }
    }

    /** La key del mensaje Kafka es siempre el carId. */
    static class SerializadorClave implements SerializationSchema<Posicion> {

        @Override
        public byte[] serialize(Posicion posicion) {
            return posicion.carId().getBytes(java.nio.charset.StandardCharsets.UTF_8);
        }
    }
}
