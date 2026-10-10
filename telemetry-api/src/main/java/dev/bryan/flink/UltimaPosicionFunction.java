package dev.bryan.flink;

import org.apache.flink.api.common.state.ValueState;
import org.apache.flink.api.common.state.ValueStateDescriptor;
import org.apache.flink.api.common.typeinfo.Types;
import org.apache.flink.streaming.api.functions.KeyedProcessFunction;
import org.apache.flink.util.Collector;

/**
 * Conserva el {@code ts} más reciente por auto y emite el evento solo si es más nuevo
 * que el guardado (spec §8, RF-F3). No usa CDI: se serializa y corre en hilos de Flink.
 */
public class UltimaPosicionFunction extends KeyedProcessFunction<String, Posicion, Posicion> {

    private transient ValueState<Long> ultimoTs;

    @Override
    public void open(org.apache.flink.api.common.functions.OpenContext openContext) {
        ultimoTs = getRuntimeContext().getState(new ValueStateDescriptor<>("ultimo-ts", Types.LONG));
    }

    @Override
    public void processElement(Posicion posicion, Context ctx, Collector<Posicion> out) throws Exception {
        Long guardado = ultimoTs.value();
        if (guardado == null || posicion.ts() > guardado) {
            ultimoTs.update(posicion.ts());
            out.collect(posicion);
        }
    }
}
