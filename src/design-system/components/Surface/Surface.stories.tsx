import type { Meta, StoryObj } from '@storybook/react-vite';
import { Text } from '../Text/Text';
import { Surface } from './Surface';

const backdrop = {
  padding: 40,
  borderRadius: 24,
  background:
    'radial-gradient(circle at 25% 30%, #ff9500 0 70px, transparent 71px), radial-gradient(circle at 70% 65%, #007aff 0 90px, transparent 91px), linear-gradient(var(--color-canvas-top), var(--color-canvas-bottom))',
};

const meta = {
  title: 'Composants/Surface',
  component: Surface,
  tags: ['autodocs'],
  args: { material: 'glass', padding: 'lg', radius: 'xl' },
  argTypes: {
    material: { control: 'inline-radio', options: ['glass', 'thick', 'solid', 'inset'] },
    padding: { control: 'inline-radio', options: ['none', 'sm', 'md', 'lg'] },
    radius: { control: 'inline-radio', options: ['md', 'lg', 'xl', 'full'] },
  },
  decorators: [(S) => <div style={backdrop}><S /></div>],
  render: (args) => (
    <Surface {...args} style={{ maxWidth: 320 }}>
      <Text variant="title-3">Vilebrequin</Text>
      <Text variant="callout" tone="secondary" style={{ marginTop: 6 }}>
        Arbre coudé qui récupère l'effort des quatre bielles et le transforme en couple moteur.
      </Text>
    </Surface>
  ),
} satisfies Meta<typeof Surface>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Verre: Story = {};
export const VerreEpais: Story = { args: { material: 'thick' } };
export const Pleine: Story = { args: { material: 'solid' } };
export const EnCreux: Story = { args: { material: 'inset', padding: 'md' } };
