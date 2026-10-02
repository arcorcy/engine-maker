import type { Meta, StoryObj } from '@storybook/react-vite';
import { Readout } from './Readout';

const meta = {
  title: 'Composants/Readout',
  component: Readout,
  tags: ['autodocs'],
  args: { value: '3 250', unit: 'tr/min', label: 'Régime moteur', size: 'lg' },
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    tone: { control: 'inline-radio', options: ['primary', 'accent', 'danger'] },
  },
} satisfies Meta<typeof Readout>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Grand: Story = {};
export const Grille: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, maxWidth: 420 }}>
      <Readout size="sm" value="108" label="combustions par seconde" />
      <Readout size="sm" value="16,8" unit="m/s" label="vitesse du piston" />
      <Readout size="sm" value="1,22" unit="m" label="par cycle de 720°" />
    </div>
  ),
};
export const ZoneRouge: Story = { args: { value: '6 300', tone: 'danger' } };
