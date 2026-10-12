import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { COLORES, FONT_FAMILY } from '../theme';

const FILAS = [
  { pos: 1, nombre: 'auto-1 · Empresa 01', color: COLORES.verde, kmh: 120, meta: 1 },
  { pos: 2, nombre: 'auto-2 · Empresa 01', color: COLORES.celeste, kmh: 95, meta: 0.82 },
  { pos: 3, nombre: 'auto-3 · Empresa 02', color: COLORES.rojo, kmh: 80, meta: 0.6 },
];

export const Clasificacion: React.FC = () => {
  const frame = useCurrentFrame();
  const total = 120;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORES.bg,
        fontFamily: FONT_FAMILY,
        justifyContent: 'center',
        padding: '0 220px',
      }}
    >
      <div style={{ color: COLORES.fg, fontSize: 64, fontWeight: 800, marginBottom: 48 }}>
        Clasificación en vivo
      </div>
      {FILAS.map((f, i) => {
        const desde = i * 18;
        const op = interpolate(frame, [desde, desde + 20], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        const slide = interpolate(frame, [desde, desde + 20], [60, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        const progreso = interpolate(frame, [desde, total - 10], [0, f.meta], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        return (
          <div
            key={f.nombre}
            style={{
              opacity: op,
              transform: `translateX(${slide}px)`,
              display: 'flex',
              alignItems: 'center',
              gap: 32,
              backgroundColor: COLORES.panel,
              border: `1px solid ${COLORES.borde}`,
              borderRadius: 20,
              padding: '28px 34px',
              marginBottom: 22,
            }}
          >
            <div style={{ color: f.color, fontSize: 54, fontWeight: 800, width: 64 }}>
              {f.pos}º
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: COLORES.fg, fontSize: 40, fontWeight: 700 }}>
                {f.nombre}
              </div>
              <div
                style={{
                  marginTop: 14,
                  height: 18,
                  backgroundColor: COLORES.bg,
                  borderRadius: 9,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${progreso * 100}%`,
                    height: '100%',
                    backgroundColor: f.color,
                  }}
                />
              </div>
            </div>
            <div style={{ color: COLORES.apagado, fontSize: 38, width: 170, textAlign: 'right' }}>
              {f.kmh} km/h
            </div>
            <div style={{ fontSize: 44, width: 70, textAlign: 'right' }}>
              {f.meta >= 1 ? '🏁' : ''}
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
