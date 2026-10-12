import { loadFont } from '@remotion/google-fonts/Inter';
import { interpolate } from 'remotion';

const { fontFamily } = loadFont();

export const COLORES = {
  bg: '#0b1220',
  panel: '#0f1a2b',
  borde: '#1e2d45',
  fg: '#e6edf7',
  apagado: '#8aa0bd',
  verde: '#22c55e',
  rojo: '#ef4444',
  celeste: '#38bdf8',
  ambar: '#f59e0b',
} as const;

export const FONT_FAMILY = `${fontFamily}, "Segoe UI", system-ui, -apple-system, sans-serif`;

export const fade = (frame: number, desde: number, dur = 15) =>
  interpolate(frame, [desde, desde + dur], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

export const subir = (frame: number, desde: number, dur = 20, px = 40) =>
  interpolate(frame, [desde, desde + dur], [px, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
