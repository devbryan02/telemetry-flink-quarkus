import { mkdirSync, writeFileSync } from 'node:fs';

const SR = 48000;
const DUR = 15;
const N = SR * DUR;
const L = new Float32Array(N);
const R = new Float32Array(N);

const NOTAS = {
  G1: 49.0,
  Bb1: 58.27,
  D2: 73.42,
  G2: 98.0,
  Bb2: 116.54,
  D3: 146.83,
  F3: 174.61,
  G3: 196.0,
};
const reverb = [0.0, 0.15, 0.28];

for (let i = 0; i < N; i++) {
  const t = i / SR;

  let pad = 0;
  for (const n of [NOTAS.G2, NOTAS.Bb2, NOTAS.D3, NOTAS.F3]) {
    pad += Math.sin(2 * Math.PI * n * t) * 0.5;
    pad += Math.sin(2 * Math.PI * n * 1.005 * t) * 0.35;
  }
  pad *= 0.5 + 0.5 * Math.sin(2 * Math.PI * 0.08 * t);
  pad *= 0.06;

  const pulso = Math.pow(Math.max(0, Math.sin(2 * Math.PI * 0.5 * t)), 3);
  const sub = Math.sin(2 * Math.PI * NOTAS.G1 * t) * pulso * 0.18;

  const beat = 1.2;
  const envKick = Math.pow(1 - (t % beat) / 0.12, 2);
  const kick =
    t % beat < 0.12
      ? Math.sin(2 * Math.PI * 60 * (1 - (t % beat) * 4) * t) * envKick * 0.12
      : 0;

  const step = 0.6;
  const idx = Math.floor(t / step);
  const seq = [NOTAS.G3, NOTAS.F3, NOTAS.D3, NOTAS.Bb2, NOTAS.D3, NOTAS.F3];
  const nseq = seq[idx % seq.length];
  const tt = t - idx * step;
  const pluck = Math.sin(2 * Math.PI * nseq * tt) * Math.exp(-6 * tt) * 0.09;

  let s = pad + sub + kick + pluck;
  for (const d of reverb) {
    const j = i - Math.floor(d * SR);
    if (j >= 0) s += L[j] * 0.22;
  }

  const fade = Math.min(1, t / 1.0, (DUR - t) / 1.5);
  s *= Math.max(0, fade);

  L[i] = s;
  R[i] = s * 0.94;
}

const bytes = Buffer.alloc(44 + N * 4);
bytes.write('RIFF', 0);
bytes.writeUInt32LE(36 + N * 4, 4);
bytes.write('WAVE', 8);
bytes.write('fmt ', 12);
bytes.writeUInt32LE(16, 16);
bytes.writeUInt16LE(1, 20);
bytes.writeUInt16LE(2, 22);
bytes.writeUInt32LE(SR, 24);
bytes.writeUInt32LE(SR * 4, 28);
bytes.writeUInt16LE(4, 32);
bytes.writeUInt16LE(16, 34);
bytes.write('data', 36);
bytes.writeUInt32LE(N * 4, 40);

let o = 44;
for (let i = 0; i < N; i++) {
  const cl = Math.max(-1, Math.min(1, L[i]));
  const cr = Math.max(-1, Math.min(1, R[i]));
  bytes.writeInt16LE((cl * 32767) | 0, o);
  bytes.writeInt16LE((cr * 32767) | 0, o + 2);
  o += 4;
}

mkdirSync('public/audio', { recursive: true });
writeFileSync('public/audio/musica.wav', bytes);
console.log('OK → public/audio/musica.wav');
