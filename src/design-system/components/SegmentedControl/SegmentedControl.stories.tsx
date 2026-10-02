import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { SegmentedControl } from './SegmentedControl';

const meta = {
  title: 'Composants/SegmentedControl',
  component: SegmentedControl,
  tags: ['autodocs'],
  decorators: [(S) => <div style={{ maxWidth: 320 }}><S /></div>],
} satisfies Meta<typeof SegmentedControl>;
export default meta;
type Story = StoryObj<typeof meta>;

export const DeuxOptions: Story = {
  args: { label: 'Liste', value: 'parts', onChange: () => {}, options: [{ value: 'parts', label: 'Pièces' }, { value: 'fails', label: 'Pannes' }] },
  render: function Render(args) {
    const [v, setV] = useState(args.value);
    return <SegmentedControl {...args} value={v} onChange={setV} />;
  },
};

export const Rapports: Story = {
  args: {
    label: 'Rapport de boîte',
    value: 'N',
    onChange: () => {},
    options: ['N', '1', '2', '3', '4', '5', '6'].map((g) => ({ value: g, label: g })),
  },
  render: DeuxOptions.render,
};

export const Petit: Story = {
  args: {
    label: 'Ralenti',
    size: 'sm',
    value: '100',
    onChange: () => {},
    options: [{ value: '1', label: '×1' }, { value: '10', label: '×1/10' }, { value: '100', label: '×1/100' }],
  },
  render: DeuxOptions.render,
};
