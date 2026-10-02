import type { Meta, StoryObj } from '@storybook/react-vite';
import { Meter } from './Meter';

const meta = {
  title: 'Composants/Meter',
  component: Meter,
  tags: ['autodocs'],
  args: { label: 'Régime', value: 3200, min: 0, max: 7000, high: 6000 },
  argTypes: { value: { control: { type: 'range', min: 0, max: 7000, step: 50 } } },
  decorators: [(S) => <div style={{ maxWidth: 320 }}><S /></div>],
} satisfies Meta<typeof Meter>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Normal: Story = {};
export const ZoneRouge: Story = { args: { value: 6400 } };
