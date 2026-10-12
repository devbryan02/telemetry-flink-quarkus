import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { COLORES, FONT_FAMILY } from '../theme';

type P = { x: number; y: number };

const RUTA: P[] = [
  { x: 220, y: 820 },
  { x: 480, y: 700 },
  { x: 760, y: 760 },
  { x: 1040, y: 560 },
  { x: 1320, y: 600 },
  { x: 1620, y: 360 },
];

function puntoEnRuta(pts: P[], t: number): P {
  const segs = pts.length - 1;
  const d = Math.min(Math.max(t, 0), 1) * segs;
  const i = Math.min(Math.floor(d), segs - 1);
  const f = d - i;
  return {
    x: pts[i].x + (pts[i + 1].x - pts[i].x) * f,
    y: pts[i].y + (pts[i + 1].y - pts[i].y) * f,
  };
}

const dRuta = (pts: P[]) => {
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) d += ` L ${pts[i].x} ${pts[i].y}`;
  return d;
};

const AUTOS = [
  { carId: 'auto-1', color: COLORES.verde, offset: 0 },
  { carId: 'auto-2', color: COLORES.celeste, offset: 0.35 },
  { carId: 'auto-3', color: COLORES.rojo, offset: 0.6 },
];

export const Mapa: React.FC = () => {
  const frame = useCurrentFrame();
  const total = 180;
  const progreso = interpolate(frame, [0, total - 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const trazado = interpolate(frame, [0, 45], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const tituloOp = interpolate(frame, [20, 45], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const largo = 2600;
  const dashOffset = largo * (1 - trazado);
  const rutaPts = dRuta(RUTA);
  const salida = RUTA[0];
  const meta = RUTA[RUTA.length - 1];

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORES.bg,
        fontFamily: FONT_FAMILY,
        backgroundImage: `linear-gradient(${COLORES.borde}33 1px, transparent 1px), linear-gradient(90deg, ${COLORES.borde}33 1px, transparent 1px)`,
        backgroundSize: '80px 80px',
      }}
    >
      <svg width="1920" height="1080" style={{ position: 'absolute', inset: 0 }}>
        <path
          d={rutaPts}
          fill="none"
          stroke={COLORES.panel}
          strokeWidth={26}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path
          d={rutaPts}
          fill="none"
          stroke={COLORES.celeste}
          strokeWidth={8}
          strokeLinejoin="round"
          strokeLinecap="round"
          strokeDasharray={largo}
          strokeDashoffset={dashOffset}
        />
        <circle cx={salida.x} cy={salida.y} r="16" fill={COLORES.fg} />
        <circle cx={meta.x} cy={meta.y} r="20" fill={COLORES.rojo} />
        {AUTOS.map((a) => {
          const t = Math.min(Math.max(progreso - a.offset, 0), 1);
          const p = puntoEnRuta(RUTA, t);
          return (
            <g key={a.carId} transform={`translate(${p.x} ${p.y})`}>
              <circle r="30" fill={a.color} opacity="0.25" />
              <circle r="16" fill={a.color} stroke={COLORES.fg} strokeWidth="3" />
            </g>
          );
        })}
      </svg>

      <div style={{ position: 'absolute', top: 90, left: 120, opacity: tituloOp }}>
        <div style={{ color: COLORES.fg, fontSize: 66, fontWeight: 800 }}>
          Rutas reales del Perú
        </div>
        <div style={{ color: COLORES.apagado, fontSize: 34, marginTop: 10 }}>
          Salida → Meta, en vivo
        </div>
      </div>
    </AbsoluteFill>
  );
};
