# Video promocional con Remotion — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Crear un proyecto Remotion aislado que renderiza un video promocional de 15 s (MP4 H.264/AAC) del producto "Telemetría de autos en tiempo real", con logo animado, 4 escenas, locución TTS en español y música de fondo sintetizada tipo "aura".

**Architecture:** Proyecto React + Remotion en `video/`, sin acoplamiento a `dashboard-next/` ni `telemetry-api/`. Una composición `Promo` (1920×1080, 30 fps, 450 frames) encadena 4 escenas con `Sequence` y monta dos `<Audio>` (locución + música). Los audios se generan con scripts propios (`edge-tts` y síntesis PCM en Node).

**Tech Stack:** Remotion 4.x, React 19, TypeScript, ESBuild (vía Remotion CLI), ESLint flat config + typescript-eslint, `@remotion/google-fonts`, `@remotion/media-utils`, Python `edge-tts`, ffmpeg (para verificación y para la síntesis opcional).

**Spec:** [`docs/superpowers/specs/2026-10-12-video-promocional-remotion-design.md`](../specs/2026-10-12-video-promocional-remotion-design.md)

## Global Constraints

- Composición: id `Promo`, **1920×1080**, **30 fps**, **450 frames (15 s exactos)**.
- Códec de salida: **H.264 + AAC**. Salida a `video/out/promo.mp4`.
- Rama de trabajo: `feature/inc-21-video-promocional-remotion`. Commits **Conventional Commits**, en español.
- No importar código desde `dashboard-next/` ni `telemetry-api/`. Paleta y fuentes propias en `src/theme.ts`.
- Paleta (fija): fondo `#0b1220`, panel `#0f1a2b`, borde `#1e2d45`, texto `#e6edf7`, apagado `#8aa0bd`, verde auto `#22c55e`, rojo meta `#ef4444`, celeste empresa `#38bdf8`, ámbar `#f59e0b`.
- Locución: voz `es-PE-CamilaNeural`. Texto exacto del guion (no cambiarlo sin actualizar la spec).
- No descargar assets con derechos (música ni voz). La música se **sintetiza**; la voz la genera TTS.
- Todos los textos/nombres visibles en español.

---

## File Structure

```
video/
├── package.json              # deps + scripts (tts, musica, lint, studio, render)
├── tsconfig.json             # TS estricto para JSX/React
├── eslint.config.mjs         # ESLint flat + typescript-eslint
├── remotion.config.ts        # config del CLI (jpeg, overwrite)
├── .gitignore                # node_modules/, out/, public/audio generados
├── README.md                 # cómo generar y renderizar
├── scripts/
│   ├── gen-locucion.mjs      # edge-tts → public/audio/locucion.mp3
│   └── gen-musica.mjs        # síntesis PCM → public/audio/musica.wav
├── public/audio/             # audios generados (no versionados)
└── src/
    ├── index.ts              # registerRoot
    ├── Root.tsx              # <Composition id="Promo" .../>
    ├── theme.ts              # paleta, fuente, helpers de tiempo/animación
    ├── Promo.tsx             # timeline: Sequence por escena + <Audio>
    └── escenas/
        ├── Logo.tsx
        ├── Mapa.tsx
        ├── Clasificacion.tsx
        └── Cierre.tsx
```

Responsabilidad por archivo:
- `theme.ts`: única fuente de verdad de colores, fuente y helpers (`fade`, `subir`). Ninguna escena define colores literales.
- `Promo.tsx`: solo composición y tiempos; no dibuja.
- `escenas/*`: cada una es pura respecto al frame (`useCurrentFrame`), sin estado compartido.

---

## Task 1: Scaffold del proyecto Remotion

**Files:**
- Create: `video/package.json`, `video/tsconfig.json`, `video/remotion.config.ts`, `video/eslint.config.mjs`, `video/.gitignore`, `video/src/index.ts`, `video/src/Root.tsx`, `video/src/Promo.tsx` (placeholder de 1 lienzo), `video/README.md`

**Interfaces:**
- Consumes: nada.
- Produces: composición `Promo` registrada y renderizable (placeholder). El entry `src/index.ts` exporta nada; llama `registerRoot(RemotionRoot)`.

- [ ] **Step 1: Crear `video/package.json`**

```json
{
  "name": "telemetria-video",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "studio": "remotion studio",
    "render": "remotion render Promo out/promo.mp4",
    "tts": "node scripts/gen-locucion.mjs",
    "musica": "node scripts/gen-musica.mjs",
    "lint": "eslint src scripts"
  },
  "dependencies": {
    "@remotion/cli": "4.0.320",
    "@remotion/google-fonts": "4.0.320",
    "@remotion/media-utils": "4.0.320",
    "react": "19.0.0",
    "react-dom": "19.0.0",
    "remotion": "4.0.320"
  },
  "devDependencies": {
    "@types/react": "19.0.0",
    "eslint": "9.17.0",
    "typescript": "5.7.2",
    "typescript-eslint": "8.18.0"
  }
}
```

- [ ] **Step 2: Crear `video/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src", "remotion.config.ts"]
}
```

- [ ] **Step 3: Crear `video/remotion.config.ts`**

```ts
import { Config } from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
Config.setCodec('h264');
```

- [ ] **Step 4: Crear `video/eslint.config.mjs`**

```js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['out/**', 'node_modules/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: { globals: { process: 'readonly', console: 'readonly' } },
  },
);
```

> Nota: `@eslint/js` viene incluido con `eslint`; si el resolvedor pide declararlo, agregarlo a `devDependencies` como `"@eslint/js": "9.17.0"`.

- [ ] **Step 5: Crear `video/.gitignore`**

```
node_modules/
out/
public/audio/*.mp3
public/audio/*.wav
public/audio/*.m4a
```

- [ ] **Step 6: Crear `video/src/index.ts`**

```ts
import { registerRoot } from 'remotion';
import { RemotionRoot } from './Root';

registerRoot(RemotionRoot);
```

- [ ] **Step 7: Crear `video/src/Root.tsx`**

```tsx
import { Composition } from 'remotion';
import { Promo } from './Promo';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="Promo"
      component={Promo}
      durationInFrames={450}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
```

- [ ] **Step 8: Crear `video/src/Promo.tsx` (placeholder)**

```tsx
import { AbsoluteFill } from 'remotion';

export const Promo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#0b1220', color: '#e6edf7' }}>
      <div style={{ margin: 'auto', fontSize: 72 }}>Promo</div>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 9: Crear `video/README.md`**

```markdown
# Video promocional (Remotion)

Video de 15 s del producto. Ver la spec en `docs/superpowers/specs/`.

```bash
npm install
npm run tts        # requiere: pip install edge-tts  (y red)
npm run musica
npm run render     # out/promo.mp4
npm run lint
npm run studio     # previsualización
```
```

- [ ] **Step 10: Instalar dependencias**

Run: `npm install` (en `video/`)
Expected: crea `node_modules/` sin errores.

- [ ] **Step 11: Verificar que el bundle y la composición existen**

Run: `npx remotion compositions` (en `video/`)
Expected: imprime `Promo` con 450 frames.

- [ ] **Step 12: Verificar un frame renderizable**

Run: `npx remotion still Promo out/_check.png --frame=0`
Expected: código 0 y `out/_check.png` creado.

- [ ] **Step 13: Lint**

Run: `npm run lint`
Expected: sin errores.

- [ ] **Step 14: Commit**

```bash
git add video
git commit -m "feat(video): scaffold del proyecto Remotion con la composicion Promo"
```

---

## Task 2: Tema, fuente y escena Logo

**Files:**
- Create: `video/src/theme.ts`, `video/src/escenas/Logo.tsx`
- Modify: `video/src/Promo.tsx`

**Interfaces:**
- Consumes: nada de tareas previas salvo la composición.
- Produces:
  - `theme.ts` exporta `COLORES: Record<string,string>`, `FONT_FAMILY: string`, `fade(frame, desde, dur) => number`, `subir(frame, desde, dur) => number`.
  - `Logo.tsx` exporta `Logo: React.FC<{ tagline?: boolean }>`.

- [ ] **Step 1: Crear `video/src/theme.ts`**

```ts
import { interpolate } from 'remotion';

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

export const FONT_FAMILY =
  '"Inter", "Segoe UI", system-ui, -apple-system, sans-serif';

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
```

- [ ] **Step 2: Crear `video/src/escenas/Logo.tsx`**

```tsx
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORES, FONT_FAMILY } from '../theme';

export const Logo: React.FC<{ tagline?: boolean }> = ({ tagline = true }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrada = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 30 });
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

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORES.bg,
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: FONT_FAMILY,
      }}
    >
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
```

- [ ] **Step 3: Montar el Logo en `Promo.tsx` (primeros 3 s)**

Reemplazar el contenido de `video/src/Promo.tsx` por:

```tsx
import { AbsoluteFill, Sequence } from 'remotion';
import { Logo } from './escenas/Logo';
import { COLORES } from './theme';

export const Promo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORES.bg }}>
      <Sequence from={0} durationInFrames={90}>
        <Logo />
      </Sequence>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 4: Verificar el frame del logo**

Run: `npx remotion still Promo out/_logo.png --frame=60`
Expected: código 0; `out/_logo.png` muestra el wordmark y el tagline.

- [ ] **Step 5: Lint**

Run: `npm run lint`
Expected: sin errores.

- [ ] **Step 6: Commit**

```bash
git add video
git commit -m "feat(video): tema y escena de logo animado"
```

---

## Task 3: Escena Mapa (ruta + 3 autos interpolados)

**Files:**
- Create: `video/src/escenas/Mapa.tsx`
- Modify: `video/src/Promo.tsx`

**Interfaces:**
- Consumes: `COLORES`, `FONT_FAMILY` de `theme.ts`.
- Produces: `Mapa: React.FC` (sin props).

- [ ] **Step 1: Crear `video/src/escenas/Mapa.tsx`**

```tsx
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
```

- [ ] **Step 2: Montar Mapa en `Promo.tsx` (frames 90–270)**

En `video/src/Promo.tsx`, importar `Mapa` y agregar el `Sequence`:

```tsx
import { AbsoluteFill, Sequence } from 'remotion';
import { Cierre } from './escenas/Cierre';
import { Clasificacion } from './escenas/Clasificacion';
import { Logo } from './escenas/Logo';
import { Mapa } from './escenas/Mapa';
import { COLORES } from './theme';

export const Promo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORES.bg }}>
      <Sequence from={0} durationInFrames={90}>
        <Logo />
      </Sequence>
      <Sequence from={90} durationInFrames={180}>
        <Mapa />
      </Sequence>
      <Sequence from={270} durationInFrames={120}>
        <Clasificacion />
      </Sequence>
      <Sequence from={390} durationInFrames={60}>
        <Cierre />
      </Sequence>
    </AbsoluteFill>
  );
};
```

> Las importaciones de `Clasificacion` y `Cierre` aún no existen: se crean en las Tasks 4 y 5. Este paso se completa al terminar la Task 5. En la Task 3, monta solo los dos primeros `Sequence` y deja los otros dos comentados o agrégalos al final de la Task 5.

- [ ] **Step 3: Verificar un frame del mapa**

Run: `npx remotion still Promo out/_mapa.png --frame=200`
Expected: código 0; se ve la ruta trazada y 3 autos sobre ella.

- [ ] **Step 4: Lint y commit**

Run: `npm run lint`

```bash
git add video
git commit -m "feat(video): escena de mapa con ruta y autos interpolados"
```

---

## Task 4: Escena Clasificación

**Files:**
- Create: `video/src/escenas/Clasificacion.tsx`
- Modify: `video/src/Promo.tsx` (agregar el `Sequence` de 270–390)

**Interfaces:**
- Consumes: `COLORES`, `FONT_FAMILY`.
- Produces: `Clasificacion: React.FC` (sin props).

- [ ] **Step 1: Crear `video/src/escenas/Clasificacion.tsx`**

```tsx
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
```

- [ ] **Step 2: Montar el `Sequence` en `Promo.tsx`**

Ya está previsto en la Task 3, Step 2 (`from={270} durationInFrames={120}`). Si en la Task 3 se dejó comentado, descomentarlo ahora.

- [ ] **Step 3: Verificar un frame**

Run: `npx remotion still Promo out/_clasif.png --frame=360`
Expected: código 0; se ven 3 filas con barras de progreso y km/h.

- [ ] **Step 4: Lint y commit**

Run: `npm run lint`

```bash
git add video
git commit -m "feat(video): escena de clasificacion en vivo"
```

---

## Task 5: Escena Cierre y timeline completo

**Files:**
- Create: `video/src/escenas/Cierre.tsx`
- Modify: `video/src/Promo.tsx`

**Interfaces:**
- Consumes: `COLORES`, `FONT_FAMILY`, `Logo` (reusa el wordmark sin tagline).
- Produces: `Cierre: React.FC` (sin props).

- [ ] **Step 1: Crear `video/src/escenas/Cierre.tsx`**

```tsx
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
      <div style={{ transform: `scale(${interpolate(frame, [20, total], [0.6, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })})` }}>
        <Logo tagline={false} />
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
```

> `Logo` usa `AbsoluteFill` con su propio fondo; al anidarlo dentro de `Cierre` hereda el tamaño completo y el `transform: scale` se aplica al contenedor. Si el fondo tapa el pipeline, envolver `Logo` en un `<div style={{ position: 'relative', width: 1200, height: 420 }}>` y ajustar; el criterio es que se vean pipeline **y** logo.

- [ ] **Step 2: Completar `Promo.tsx` con los 4 `Sequence`**

`video/src/Promo.tsx` debe quedar exactamente así (sin `<Audio>` todavía):

```tsx
import { AbsoluteFill, Sequence } from 'remotion';
import { Cierre } from './escenas/Cierre';
import { Clasificacion } from './escenas/Clasificacion';
import { Logo } from './escenas/Logo';
import { Mapa } from './escenas/Mapa';
import { COLORES } from './theme';

export const Promo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORES.bg }}>
      <Sequence from={0} durationInFrames={90}>
        <Logo />
      </Sequence>
      <Sequence from={90} durationInFrames={180}>
        <Mapa />
      </Sequence>
      <Sequence from={270} durationInFrames={120}>
        <Clasificacion />
      </Sequence>
      <Sequence from={390} durationInFrames={60}>
        <Cierre />
      </Sequence>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 3: Verificar frames de las 4 escenas**

Run: `npx remotion still Promo out/_f0.png --frame=45` y `npx remotion still Promo out/_f3.png --frame=420`
Expected: código 0; `_f0.png` con el pipeline+logo, `_f3.png` con el cierre.

- [ ] **Step 4: Render completo (sin audio todavía)**

Run: `npx remotion render Promo out/promo-sinaudio.mp4`
Expected: código 0 y el archivo creado.

- [ ] **Step 5: Lint y commit**

Run: `npm run lint`

```bash
git add video
git commit -m "feat(video): escena de cierre y timeline completo de 15 s"
```

---

## Task 6: Audio — locución TTS y música sintetizada

**Files:**
- Create: `video/scripts/gen-locucion.mjs`, `video/scripts/gen-musica.mjs`
- Modify: `video/src/Promo.tsx` (montar `<Audio>`), `video/README.md`

**Interfaces:**
- Consumes: composición `Promo`.
- Produces:
  - `public/audio/locucion.mp3` (locución es-PE).
  - `public/audio/musica.wav` (48 kHz, estéreo, 15 s).

- [ ] **Step 1: Crear `video/scripts/gen-locucion.mjs`**

```js
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const VOZ = 'es-PE-CamilaNeural';
const TEXTO =
  'Mira tus vehículos avanzar en tiempo real sobre rutas reales del Perú. ' +
  'Kafka transporta la telemetría, Flink calcula la última posición y el ' +
  'dashboard la muestra al instante. Telemetría en tiempo real.';

mkdirSync('public/audio', { recursive: true });

const probe = spawnSync('python', ['-m', 'edge_tts', '--help'], { stdio: 'ignore' });
if (probe.status !== 0) {
  console.error(
    'edge-tts no está disponible. Instálalo con:  pip install edge-tts',
  );
  process.exit(1);
}

const r = spawnSync(
  'python',
  [
    '-m',
    'edge_tts',
    '--voice',
    VOZ,
    '--text',
    TEXTO,
    '--write-media',
    'public/audio/locucion.mp3',
  ],
  { stdio: 'inherit' },
);

if (r.status !== 0) {
  console.error('La generación de la locución falló.');
  process.exit(r.status ?? 1);
}
console.log('OK → public/audio/locucion.mp3');
```

- [ ] **Step 2: Crear `video/scripts/gen-musica.mjs`**

Síntesis "aura" (pad oscuro + sub-bajo con pulso half-time + pluck de campana + kick tenue) y escritura de un WAV PCM 16-bit.

```js
import { mkdirSync, writeFileSync } from 'node:fs';

const SR = 48000;
const DUR = 15;
const N = SR * DUR;
const L = new Float32Array(N);
const R = new Float32Array(N);

const NOTAS = { G1: 49.0, Bb1: 58.27, D2: 73.42, G2: 98.0, Bb2: 116.54, D3: 146.83, F3: 174.61, G3: 196.0 };
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
  const envKick = Math.pow(1 - ((t % beat) / 0.12), 2);
  const kick = t % beat < 0.12 ? Math.sin(2 * Math.PI * 60 * (1 - (t % beat) * 4) * t) * envKick * 0.12 : 0;

  let pluck = 0;
  const step = 0.6;
  const idx = Math.floor(t / step);
  const seq = [NOTAS.G3, NOTAS.F3, NOTAS.D3, NOTAS.Bb2, NOTAS.D3, NOTAS.F3];
  const nseq = seq[idx % seq.length];
  const tt = t - idx * step;
  pluck = Math.sin(2 * Math.PI * nseq * tt) * Math.exp(-6 * tt) * 0.09;

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
```

- [ ] **Step 3: Montar el audio en `Promo.tsx`**

`video/src/Promo.tsx` final:

```tsx
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile } from 'remotion';
import { Cierre } from './escenas/Cierre';
import { Clasificacion } from './escenas/Clasificacion';
import { Logo } from './escenas/Logo';
import { Mapa } from './escenas/Mapa';
import { COLORES } from './theme';

const VENTANA_VOZ: [number, number] = [20, 420];

export const Promo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORES.bg }}>
      <Audio
        src={staticFile('audio/musica.wav')}
        volume={(f) =>
          interpolate(
            f,
            [0, 30, VENTANA_VOZ[0], VENTANA_VOZ[1], 435, 450],
            [0, 0.16, 0.16, 0.16, 0.16, 0],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
          ) *
          (f >= VENTANA_VOZ[0] && f <= VENTANA_VOZ[1] ? 0.55 : 1)
        }
      />
      <Audio src={staticFile('audio/locucion.mp3')} volume={1} />

      <Sequence from={0} durationInFrames={90}>
        <Logo />
      </Sequence>
      <Sequence from={90} durationInFrames={180}>
        <Mapa />
      </Sequence>
      <Sequence from={270} durationInFrames={120}>
        <Clasificacion />
      </Sequence>
      <Sequence from={390} durationInFrames={60}>
        <Cierre />
      </Sequence>
    </AbsoluteFill>
  );
};
```

> El `×0.55` durante `VENTANA_VOZ` es el *ducking* de la música bajo la locución. Ajustar `VENTANA_VOZ` al terminar la Task 6 Step 4 según dónde caiga realmente la voz.

- [ ] **Step 4: Generar los audios y verificar**

Run: `python -m pip install edge-tts` (una vez)
Run: `npm run tts`
Run: `npm run musica`
Expected: `public/audio/locucion.mp3` y `public/audio/musica.wav` creados.

Verificar duración y formato:

Run: `ffprobe -v error -show_entries format=duration -of csv=p=0 public/audio/locucion.mp3`
Expected: un número ≈ entre 10 y 14 s.

- [ ] **Step 5: Lint y commit**

Run: `npm run lint`

```bash
git add video
git commit -m "feat(video): locucion TTS y musica sintetizada con mezcla y ducking"
```

---

## Task 7: Render final, verificación y entrega

**Files:**
- Modify: `video/README.md` (nota de salida), `docs/presentacion/` (copia del MP4)

**Interfaces:**
- Consumes: todo lo anterior.
- Produces: `video/out/promo.mp4` y `docs/presentacion/promo-remotion.mp4`.

- [ ] **Step 1: Render final**

Run (en `video/`): `npx remotion render Promo out/promo.mp4`
Expected: código 0 y `out/promo.mp4`.

- [ ] **Step 2: Verificar con ffprobe**

Run:
```
ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,width,height,r_frame_rate -of default=nw=1 out/promo.mp4
ffprobe -v error -select_streams a:0 -show_entries stream=codec_name -of default=nw=1 out/promo.mp4
ffprobe -v error -show_entries format=duration -of csv=p=0 out/promo.mp4
```
Expected: video `h264`, 1920×1080, 30/1; audio `aac`; duración ≈ `15.0`.

- [ ] **Step 3: Copiar la entrega**

Run (desde la raíz del repo):
```powershell
Copy-Item "video\out\promo.mp4" "docs\presentacion\promo-remotion.mp4" -Force
```
Expected: el archivo existe en `docs/presentacion/`.

- [ ] **Step 4: Lint final**

Run (en `video/`): `npm run lint`
Expected: sin errores.

- [ ] **Step 5: Actualizar `video/README.md`**

Agregar la sección de salida:

```markdown
## Salida

- `out/promo.mp4` — 15 s, 1920×1080, H.264 + AAC.
- Entrega copiada a `docs/presentacion/promo-remotion.mp4`.
```

- [ ] **Step 6: Commit**

```bash
git add video/README.md docs/presentacion/promo-remotion.mp4
git commit -m "feat(video): render final del video promocional de 15 s"
```

---

## Self-Review

**1. Cobertura de la spec**
- Proyecto aislado `video/` → Task 1. ✓
- Composición `Promo` 1920×1080/30fps/450 → Tasks 1, 5. ✓
- Escena Logo → Task 2. ✓
- Escena Mapa (ruta + autos interpolados) → Task 3. ✓
- Escena Clasificación → Task 4. ✓
- Escena Cierre (pipeline + logo + CTA) → Task 5. ✓
- Locución TTS es-PE + guion exacto → Task 6. ✓
- Música tipo aura sintetizada + mezcla/ducking/fades → Task 6. ✓
- Render MP4 H.264/AAC + ffprobe + copia a `docs/presentacion/` → Task 7. ✓
- Lint en `video/` → Tasks 1–7. ✓
- Rama + commits conventional → todas las tasks. ✓

**2. Placeholders:** ninguno; todos los pasos incluyen código o comandos concretos.

**3. Consistencia de tipos/nombres:** `COLORES`, `FONT_FAMILY`, `fade`, `subir` (theme); `Logo({tagline})`, `Mapa`, `Clasificacion`, `Cierre` (escenas); id `Promo`, `VENTANA_VOZ`. Coinciden entre tasks.

**Nota de riesgo:** `@remotion/cli@4.0.320` y demás versiones se fijan; si el registro rechaza alguna, usar la última 4.0.x estable y mantener todas las `@remotion/*` en la **misma** versión (Remotion lo exige).
