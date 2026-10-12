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
