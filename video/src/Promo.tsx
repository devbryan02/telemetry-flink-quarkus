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
