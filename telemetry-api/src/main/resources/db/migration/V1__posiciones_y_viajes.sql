CREATE TABLE tb_ultima_posicion (
    car_id text PRIMARY KEY CHECK (length(trim(car_id)) > 0),
    company_id text, fleet_id text,
    lat double precision NOT NULL CHECK (lat BETWEEN -90 AND 90),
    lon double precision NOT NULL CHECK (lon BETWEEN -180 AND 180),
    heading integer NOT NULL CHECK (heading BETWEEN 0 AND 359),
    engine text NOT NULL CHECK (engine IN ('ON','OFF')),
    battery integer NOT NULL CHECK (battery BETWEEN 0 AND 100),
    ts bigint NOT NULL CHECK (ts >= 0),
    schema_version integer, event_id uuid, carrera_id uuid, viaje_id uuid,
    ruta_id text, inicio_viaje_ts bigint, tipo_evento text, motivo_fin text
);

CREATE TABLE tb_viaje (
    viaje_id uuid PRIMARY KEY, carrera_id uuid NOT NULL,
    car_id text NOT NULL, ruta_id text NOT NULL,
    company_id text, fleet_id text,
    inicio_viaje_ts bigint NOT NULL CHECK (inicio_viaje_ts >= 0),
    fin_ts bigint, ultimo_ts bigint NOT NULL,
    estado text NOT NULL CHECK (estado IN ('SIN_CIERRE','FINALIZADO','DETENIDO','REEMPLAZADO')),
    motivo_fin text,
    CHECK (ultimo_ts >= inicio_viaje_ts),
    CHECK (fin_ts IS NULL OR (fin_ts >= inicio_viaje_ts AND fin_ts >= ultimo_ts)),
    CHECK ((estado = 'SIN_CIERRE' AND fin_ts IS NULL AND motivo_fin IS NULL)
        OR (fin_ts IS NOT NULL AND motivo_fin IS NOT NULL AND
            ((estado = 'FINALIZADO' AND motivo_fin = 'META')
             OR (estado = 'DETENIDO' AND motivo_fin = 'DETENIDO')
             OR (estado = 'REEMPLAZADO' AND motivo_fin = 'REEMPLAZADO'))))
);

CREATE TABLE tb_posicion_historial (
    event_id uuid PRIMARY KEY,
    viaje_id uuid NOT NULL REFERENCES tb_viaje(viaje_id),
    schema_version integer NOT NULL CHECK (schema_version = 2),
    carrera_id uuid NOT NULL, ruta_id text NOT NULL,
    inicio_viaje_ts bigint NOT NULL CHECK (inicio_viaje_ts >= 0),
    tipo_evento text NOT NULL CHECK (tipo_evento IN ('INICIO','POSICION','FIN')),
    motivo_fin text,
    car_id text NOT NULL CHECK (length(trim(car_id)) > 0),
    company_id text, fleet_id text,
    lat double precision NOT NULL CHECK (lat BETWEEN -90 AND 90),
    lon double precision NOT NULL CHECK (lon BETWEEN -180 AND 180),
    heading integer NOT NULL CHECK (heading BETWEEN 0 AND 359),
    engine text NOT NULL CHECK (engine IN ('ON','OFF')),
    battery integer NOT NULL CHECK (battery BETWEEN 0 AND 100),
    ts bigint NOT NULL CHECK (ts >= inicio_viaje_ts),
    received_at timestamptz NOT NULL DEFAULT now(),
    CHECK ((tipo_evento = 'FIN' AND motivo_fin IS NOT NULL AND motivo_fin IN ('META','DETENIDO','REEMPLAZADO'))
        OR (tipo_evento <> 'FIN' AND motivo_fin IS NULL))
);
CREATE INDEX idx_tb_posicion_historial_viaje_ts_event ON tb_posicion_historial(viaje_id,ts,event_id);
CREATE INDEX idx_tb_viaje_auto_inicio ON tb_viaje(car_id,inicio_viaje_ts DESC,viaje_id DESC);
CREATE INDEX idx_tb_viaje_carrera_inicio ON tb_viaje(carrera_id,inicio_viaje_ts DESC,viaje_id DESC);
CREATE INDEX idx_tb_viaje_inicio ON tb_viaje(inicio_viaje_ts DESC,viaje_id DESC);
