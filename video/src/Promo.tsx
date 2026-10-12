import { AbsoluteFill, Sequence } from 'remotion';
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
    </AbsoluteFill>
  );
};
