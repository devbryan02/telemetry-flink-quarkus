# Diseño: video promocional de 15 s con Remotion

**Fecha:** 2026-10-12
**Rama:** `feature/inc-21-video-promocional-remotion`
**Producto:** Telemetría de autos en tiempo real (carreras de 3 autos en rutas reales del Perú · Kafka → Flink → Quarkus → Next.js).

## Objetivo

Producir un video promocional corto (**15 s exactos, MP4 H.264 + AAC**) que explique el producto con
animación de texto, un logo animado y una pista de audio compuesta por **locución TTS en español** y
**música de fondo tipo "aura" TikTok**. El video se genera de forma reproducible desde el repositorio.

## Alcance

**Incluido:** proyecto Remotion aislado, 4 escenas, logo vectorial animado, locución TTS en español,
música sintetizada, render a MP4 y copia del resultado a `docs/presentacion/`.

**Fuera de alcance:** capturas reales del dashboard en vivo, subtítulos, más de un idioma, más de un
formato de salida, y cualquier asset de terceros con derechos (música/voz descargadas).

## Enfoque

Proyecto **Remotion aislado** en `video/`, sin tocar `dashboard-next/` ni `telemetry-api/`. La locución
se genera con **`edge-tts`** (voces neuronales de Microsoft Edge, gratis y sin API key, requiere red al
generar) y la música con un **script de síntesis** propio. No se descargan assets con derechos.

### Por qué no las alternativas

- **Remotion dentro de `dashboard-next/`:** acopla el build del dashboard a un bundler ajeno (Remotion) y
  ensucia el feature frontend. Descartado.
- **TTS en la nube (ElevenLabs) + música aportada por el usuario:** exige API key, cuentas y assets
  externos; rompe el principio "100 % local" del proyecto. Descartado.

## Estructura

```
video/
├── package.json                 (remotion, @remotion/cli, react, react-dom, typescript, @remotion/media-utils,
│                                 eslint, typescript-eslint; scripts: tts, musica, lint)
├── tsconfig.json
├── eslint.config.mjs
├── remotion.config.ts
├── .gitignore                   (node_modules/, out/, public/audio/*.mp3, public/audio/*.wav)
├── scripts/
│   ├── gen-locucion.mjs         (invoca edge-tts → public/audio/locucion.mp3)
│   └── gen-musica.mjs           (síntesis → public/audio/musica.wav)
├── public/audio/                (audios generados; no versionados)
└── src/
    ├── Root.tsx                 (registra la composición "Promo")
    ├── Promo.tsx                (timeline: encadena escenas + <Audio>)
    ├── theme.ts                 (paleta y tipografía)
    └── escenas/
        ├── Logo.tsx
        ├── Mapa.tsx
        ├── Clasificacion.tsx
        └── Cierre.tsx
```

## Composición

| Parámetro | Valor |
|---|---|
| id | `Promo` |
| Resolución | 1920 × 1080 |
| FPS | 30 |
| Duración | 450 frames = 15 s exactos |
| Códec | H.264 + AAC |
| Salida | `video/out/promo.mp4`, copia a `docs/presentacion/promo-remotion.mp4` |

## Timeline y escenas

| # | Escena | Frames (30 fps) | Contenido |
|---|---|---|---|
| 1 | **Logo** (`Logo.tsx`) | 0–90 (0–3 s) | Entra el wordmark **TELEMETRÍA** con ícono de auto/señal; tagline "Tiempo real · Kafka + Flink". |
| 2 | **Mapa** (`Mapa.tsx`) | 90–270 (3–9 s) | Mapa estilizado oscuro; se traza la ruta (Salida → Meta), 3 íconos de auto se desplazan interpolados con estela; rótulo "Rutas reales del Perú". |
| 3 | **Clasificación** (`Clasificacion.tsx`) | 270–390 (9–13 s) | Panel de carrera: 3 filas con posición, barra de progreso, km/h y llegada a meta animándose. |
| 4 | **Cierre** (`Cierre.tsx`) | 390–450 (13–15 s) | Pipeline `Simulación → Kafka → Flink → Dashboard`, logo final y CTA. |

Las escenas se encadenan con transiciones suaves dentro de `Promo.tsx`. Todos los valores visuales
(colores, easings, duraciones) viven en `theme.ts`; ninguna escena importa código de `dashboard-next`.

## Audio

### Locución (TTS)

- Motor: `edge-tts` (Python). Voz: **`es-PE-CamilaNeural`**.
- Guion (~32 palabras ≈ 13 s, deja aire al final):

  > "Mira tus vehículos avanzar en tiempo real sobre rutas reales del Perú. Kafka transporta la
  > telemetría, Flink calcula la última posición y el dashboard la muestra al instante. Telemetría en
  > tiempo real."

- Se genera con `scripts/gen-locucion.mjs` a `public/audio/locucion.mp3`.

### Música de fondo (tipo "aura" TikTok)

- Estilo: drone/pad oscuro con reverb largo, sub-bajo (seno ~40–55 Hz) con pulso lento, arpegio de
  campana/pluck suave y kick/hat muy tenue a ~half-time (≈ 75–85 BPM percibidos).
- Generada por síntesis en `scripts/gen-musica.mjs` → `public/audio/musica.wav` (48 kHz, 15 s).
- **Sin derechos:** no se descarga ninguna pista.

### Mezcla

- Música a ~-16 dB con *ducking* bajo la voz; *fade-in* de 1 s y *fade-out* al cierre hasta 15 s.
- Locución a nivel nominal. `Promo.tsx` monta ambos con `<Audio>` y los volúmenes correspondientes.

## Flujo de generación

```bash
cd video
npm install
npm run tts        # edge-tts → public/audio/locucion.mp3   (requiere red + `pip install edge-tts`)
npm run musica     # síntesis → public/audio/musica.wav
npx remotion render Promo out/promo.mp4
```

`npm run tts` verifica que `edge-tts` esté instalado y, si falta, indica `pip install edge-tts`.

## Pruebas y verificación

- **Sin tests unitarios** de video (es contenido, no lógica de negocio). La verificación es:
  1. `npx remotion studio` renderiza las 4 escenas sin error y sin warnings de hooks.
  2. `npx remotion render Promo out/promo.mp4` termina con código 0.
  3. `ffprobe` confirma: H.264 + AAC, 1920×1080, 30 fps, duración ≈ 15.0 s.
  4. Reproducción manual: se escucha la locución nítida y la música por debajo; el logo aparece en los
     primeros 3 s y el CTA en los últimos 2 s.
- **`npm run lint`** en `video/` (ESLint flat config + typescript-eslint) sin errores.

## Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| `edge-tts` no instalado o sin red | No hay locución | El script falla con un mensaje claro; alternativa: `pip install edge-tts` o sustituir la voz por otra `es-PE`/`es-*`. |
| Fuentes de sistema ausentes en el render | Tipografía distinta a la esperada | Se fijan fuentes vía `@remotion/google-fonts` o familia embebida, sin depender de fuentes locales. |
| Música sintetizada con poca calidad | Fondo desagradable | Se itera en `gen-musica.mjs`; se puede silenciar la música sin tocar las escenas. |
| Potencia de CPU insuficiente para render | Render lento | Bajar a `--scale 0.5` para previsualización; el render final a 1080p. |

## Criterios de aceptación

- [ ] Existe `video/` con la composición `Promo` (1920×1080, 30 fps, 450 frames).
- [ ] El video incluye animación de texto, un logo animado y las 4 escenas descritas.
- [ ] El audio contiene locución TTS en español y música de fondo tipo aura mezcladas y audibles.
- [ ] `npx remotion render Promo out/promo.mp4` produce un MP4 H.264/AAC de ≈ 15 s.
- [ ] La copia final queda en `docs/presentacion/promo-remotion.mp4`.
- [ ] `video/` pasa su lint sin errores.
- [ ] Todo queda en la rama `feature/inc-21-video-promocional-remotion` con commits conventional.
