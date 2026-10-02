import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { systemColors } from '../../tokens';
import { Badge } from '../Badge/Badge';
import { IconButton } from '../IconButton/IconButton';
import { ListItem } from './ListItem';

const meta = {
  title: 'Composants/ListItem',
  component: ListItem,
  tags: ['autodocs'],
  args: { title: 'Pistons', dot: systemColors.orange, meta: '×4', onSelect: fn() },
  decorators: [(S) => <div style={{ maxWidth: 300 }}><S /></div>],
} satisfies Meta<typeof ListItem>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Selectionne: Story = { args: { selected: true } };
export const AvecAccessoire: Story = {
  args: { accessory: <IconButton icon="eye" label="Masquer" size="sm" tooltip={false} /> },
};
export const Masque: Story = {
  args: { dimmed: true, accessory: <IconButton icon="eyeSlash" label="Afficher" size="sm" tooltip={false} /> },
};
export const Panne: Story = {
  args: {
    dot: undefined,
    meta: undefined,
    title: 'Joint de culasse claqué',
    subtitle: 'Fumée blanche, liquide de refroidissement qui baisse, huile laiteuse.',
    leading: <Badge tone="danger">4</Badge>,
  },
};
export const PanneSelectionnee: Story = { args: { ...Panne.args, tone: 'danger', selected: true } };

export const Liste: Story = {
  render: () => (
    <div>
      {[['Bloc-cylindres', 1], ['Joint de culasse', 1], ['Culasse', 1], ['Cache-culbuteurs', 1], ["Carter d'huile", 1]].map(([n, q], i) => (
        <ListItem key={n} title={n} meta={`×${q}`} dot={systemColors.gray} selected={i === 2}
          accessory={<IconButton icon="eye" label={`Masquer ${n}`} size="sm" tooltip={false} />} />
      ))}
    </div>
  ),
};
