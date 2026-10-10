package dev.bryan.autos;

import io.smallrye.common.annotation.Identifier;
import io.smallrye.reactive.messaging.kafka.KafkaConsumerRebalanceListener;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.Collection;
import org.apache.kafka.clients.consumer.Consumer;
import org.apache.kafka.common.TopicPartition;

/**
 * El estado vive en memoria: al arrancar hay que releer {@code ultima-posicion} completo
 * (topic compactado, un valor por auto) aunque el grupo ya tenga offsets confirmados.
 * Los offsets se siguen confirmando para poder medir el lag del grupo.
 */
@ApplicationScoped
@Identifier("reconstruir-estado")
class ReconstruirEstadoListener implements KafkaConsumerRebalanceListener {

    @Override
    public void onPartitionsAssigned(Consumer<?, ?> consumer, Collection<TopicPartition> partitions) {
        consumer.seekToBeginning(partitions);
    }
}
