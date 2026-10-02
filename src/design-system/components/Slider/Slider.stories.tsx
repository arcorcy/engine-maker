import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Slider } from './Slider';

const meta = {
  title: 'Composants/Slider',
  component: Slider,
  tags: ['autodocs'],
  args: { label: 'Régime', value: 1200, min: 800, max: 6500, step: 50, onChange: () => {} },
  argTypes: { tone: { control: 'inline-radio', options: ['accent', 'danger', 'neutral'] } },
  decorators: [(S) => <div style={{ maxWidth: 320 }}><S /></div>],
  render: function Render(args) {
    const [v, setV] = useState(args.value);
    return <Slider {...args} value={v} onChange={setV} valueLabel={`${v.toLocaleString('fr-FR')} tr/min`} />;
  },
} satisfies Meta<typeof Slider>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const EnLigne: Story = { args: { inline: true, label: 'Éclaté', value: 40, min: 0, max: 100, step: 1 } };
export const ZoneRouge: Story = { args: { tone: 'danger', value: 6200 } };
export const SansLibelle: Story = { args: { hideLabel: true } };
