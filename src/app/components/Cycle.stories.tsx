import type { Meta, StoryObj } from '@storybook/react-vite';
import { Surface } from '@ds';
import { useTelemetry } from '../state/store';
import { Cycle } from './Cycle';

/* Télémétrie figée, pour montrer l'onglet sans la scène 3D : une courbe de pression plausible et des tubulures tièdes */
const trace = Array.from({ length: 720 }, (_, k) => {
  const a = (k % 180) * 4;
  const comp = a < 360 ? 1 + Math.max(0, (a - 180) / 180) ** 3 * 18 : 0;
  const fire = a >= 355 && a < 540 ? 18 + 46 * Math.exp(-((a - 372) ** 2) / 400) - (a - 355) * 0.08 : 0;
  return Math.max(1, comp, fire);
});

const meta = {
  title: 'Application/Cycle',
  component: Cycle,
  parameters: { layout: 'centered' },
  decorators: [
    (S) => {
      useTelemetry.setState({ psi: 520, strokes: [2, 3, 1, 0], pressures: [6, 1, 18, 1], trace, heat: [0.62, 0.3, 0.45, 0.2] });
      return (
        <Surface material="solid" style={{ width: 344 }}>
          <S />
        </Surface>
      );
    },
  ],
} satisfies Meta<typeof Cycle>;
export default meta;

export const Default: StoryObj<typeof meta> = {};
