import type { Meta, StoryObj } from '@storybook/react-vite';
import { systemColors } from '../../tokens';
import { Badge } from './Badge';

const meta = {
  title: 'Composants/Badge',
  component: Badge,
  tags: ['autodocs'],
  args: { children: 'Quantité 4', tone: 'neutral' },
  argTypes: { tone: { control: 'inline-radio', options: ['neutral', 'accent', 'danger', 'warning'] } },
} satisfies Meta<typeof Badge>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Neutre: Story = {};
export const Systeme: Story = { args: { dot: systemColors.orange, children: 'Équipage mobile' } };
export const Gravites: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <Badge>Gravité faible</Badge>
      <Badge tone="warning">Gravité moyenne</Badge>
      <Badge tone="danger">Gravité élevée</Badge>
      <Badge tone="danger">Gravité critique</Badge>
      <Badge tone="accent">Sélection</Badge>
    </div>
  ),
};
