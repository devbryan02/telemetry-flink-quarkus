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
  console.error('edge-tts no está disponible. Instálalo con:  pip install edge-tts');
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
