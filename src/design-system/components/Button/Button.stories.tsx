import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { icons } from '../Icon/icons';
import { Button } from './Button';

const meta = {
  title: 'Composants/Button',
  component: Button,
  tags: ['autodocs'],
  args: { children: 'Éclater le moteur', variant: 'secondary', size: 'md', onClick: fn() },
  argTypes: {
    variant: { control: 'inline-radio', options: ['primary', 'secondary', 'plain', 'destructive'] },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    icon: { control: 'select', options: [undefined, ...Object.keys(icons)] },
  },
} satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = { args: { variant: 'primary', children: 'Faire tourner', icon: 'play' } };
export const Secondary: Story = {};
export const Plain: Story = { args: { variant: 'plain', children: 'Tout afficher' } };
export const Destructive: Story = { args: { variant: 'destructive', children: 'Quitter la panne' } };
export const Enfonce: Story = { name: 'Secondary enfoncé', args: { 'aria-pressed': true, children: 'Isoler le système' } };

export const Tailles: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <Button {...args} size="sm">Petit</Button>
      <Button {...args} size="md">Moyen</Button>
      <Button {...args} size="lg">Grand</Button>
    </div>
  ),
};

export const Variantes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      <Button {...args} variant="primary" icon="play">Faire tourner</Button>
      <Button {...args} variant="secondary">Isoler</Button>
      <Button {...args} variant="plain">Recadrer</Button>
      <Button {...args} variant="destructive" icon="warning">Simuler la panne</Button>
      <Button {...args} disabled>Désactivé</Button>
    </div>
  ),
};
