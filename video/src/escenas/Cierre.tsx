import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { COLORES, FONT_FAMILY } from '../theme';
import { Logo } from './Logo';

const PASOS = ['Simulación', 'Kafka', 'Flink', 'Dashboard'];

export const Cierre: React.FC = () => {
  const frame = useCurrentFrame();
  const total = 60;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORES.bg,
        fontFamily: FONT_FAMILY,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 26, marginBottom: 70 }}>
        {PASOS.map((p, i) => {
          const desde = i * 8;
          const op = interpolate(frame, [desde, desde + 14], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          return (
            <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 26, opacity: op }}>
              <div
                style={{
                  backgroundColor: COLORES.panel,
                  border: `2px solid ${COLORES.celeste}`,
                  borderRadius: 16,
                  padding: '20px 34px',
                  color: COLORES.fg,
                  fontSize: 40,
                  fontWeight: 700,
                }}
              >
                {p}
              </div>
              {i < PASOS.length - 1 ? (
                <div style={{ color: COLORES.celeste, fontSize: 46 }}>→</div>
              ) : null}
            </div>
          );
        })}
      </div>
      <div
        style={{
          transform: `scale(${interpolate(frame, [20, total], [0.6, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          })})`,
        }}
      >
        <Logo tagline={false} conFondo={false} />
      </div>
      <div
        style={{
          marginTop: 40,
          opacity: interpolate(frame, [34, 52], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
          color: COLORES.ambar,
          fontSize: 44,
          letterSpacing: 2,
        }}
      >
        Tiempo real · Extremo a extremo
      </div>
    </AbsoluteFill>
  );
};
