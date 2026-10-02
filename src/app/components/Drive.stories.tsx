import type { Meta, StoryObj } from '@storybook/react-vite';
import { Surface } from '@ds';
import { Drive } from './Drive';

/** Exemple de composition : l'onglet Conduite de l'inspecteur, assemblé uniquement avec les composants du design system. */
const meta = {
  title: 'Application/Conduite',
  component: Drive,
  parameters: { layout: 'centered' },
  decorators: [
    (S) => (
      <Surface material="solid" style={{ width: 344 }}>
        <S />
      </Surface>
    ),
  ],
} satisfies Meta<typeof Drive>;
export default meta;

export const Default: StoryObj<typeof meta> = {};
