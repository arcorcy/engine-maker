import type { Meta, StoryObj } from '@storybook/react-vite';
import { textStyles } from '../../tokens';
import { Text } from './Text';

const meta = {
  title: 'Composants/Text',
  component: Text,
  tags: ['autodocs'],
  args: { children: 'Bloc-cylindres', variant: 'body', tone: 'primary' },
  argTypes: {
    variant: { control: 'select', options: textStyles },
    tone: { control: 'inline-radio', options: ['primary', 'secondary', 'tertiary', 'accent', 'danger'] },
  },
} satisfies Meta<typeof Text>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Hierarchie: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 14 }}>
      {textStyles.map((v) => (
        <div key={v} style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'baseline', gap: 16 }}>
          <Text variant="footnote" tone="tertiary" as="span">{v}</Text>
          <Text variant={v}>Quatre cylindres, seize soupapes</Text>
        </div>
      ))}
    </div>
  ),
};

export const LibelleDeSection: Story = {
  args: { variant: 'caption', tone: 'tertiary', caps: true, children: 'Fonctionnement' },
};
