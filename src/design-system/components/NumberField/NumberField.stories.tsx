import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { NumberField } from './NumberField';

const meta = {
  title: 'Composants/NumberField',
  component: NumberField,
  tags: ['autodocs'],
  args: { label: 'Régime moteur', value: 1200, min: 800, max: 6500, step: 50, unit: 'tr/min', onChange: () => {} },
  argTypes: { tone: { control: 'inline-radio', options: ['primary', 'danger'] } },
  render: function Render(args) {
    const [v, setV] = useState(args.value);
    return <NumberField {...args} value={v} onChange={setV} />;
  },
} satisfies Meta<typeof NumberField>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const ZoneRouge: Story = { args: { value: 6200, tone: 'danger' } };
export const SansUnite: Story = { args: { label: 'Quantité', value: 4, min: 1, max: 16, step: 1, unit: undefined, digits: 2 } };
