import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { COLORES, FONT_FAMILY } from '../theme';

export const Logo: React.FC<{ tagline?: boolean; conFondo?: boolean }> = ({
  tagline = true,
  conFondo = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrada = spring({
    frame,
    fps,
    config: { damping: 200 },
    durationInFrames: 30,
  });
  const escala = interpolate(entrada, [0, 1], [0.85, 1]);
  const opacidad = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: 'clamp' });
  const linea = interpolate(frame, [12, 40], [0, 420], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const tagO = interpolate(frame, [30, 50], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const contenido = (
    <div style={{ opacity: opacidad, transform: `scale(${escala})`, textAlign: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 28, justifyContent: 'center' }}>
        <IconoAuto />
        <span
          style={{
            color: COLORES.fg,
            fontSize: 132,
            fontWeight: 800,
            letterSpacing: 6,
          }}
        >
          TELEMETRÍA
        </span>
      </div>
      <div
        style={{
          height: 4,
          width: linea,
          backgroundColor: COLORES.celeste,
          margin: '26px auto 0',
          borderRadius: 2,
        }}
      />
      {tagline ? (
        <div
          style={{
            opacity: tagO,
            marginTop: 24,
            color: COLORES.apagado,
            fontSize: 40,
            letterSpacing: 3,
          }}
        >
          Tiempo real · Kafka + Flink
        </div>
      ) : null}
    </div>
  );

  if (!conFondo) {
    return <div style={{ fontFamily: FONT_FAMILY }}>{contenido}</div>;
  }

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORES.bg,
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: FONT_FAMILY,
      }}
    >
      {contenido}
    </AbsoluteFill>
  );
};

const IconoAuto: React.FC = () => (
  <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
    <rect x="18" y="42" width="84" height="40" rx="12" fill={COLORES.celeste} />
    <rect x="34" y="30" width="52" height="20" rx="8" fill={COLORES.verde} />
    <circle cx="38" cy="86" r="10" fill={COLORES.fg} />
    <circle cx="82" cy="86" r="10" fill={COLORES.fg} />
  </svg>
);
