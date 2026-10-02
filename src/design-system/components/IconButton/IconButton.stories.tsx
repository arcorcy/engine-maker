import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { fn } from 'storybook/test';
import { icons } from '../Icon/icons';
import { IconButton } from './IconButton';

const meta = {
  title: 'Composants/IconButton',
  component: IconButton,
  tags: ['autodocs'],
  args: { icon: 'cut', label: 'Vue en coupe', variant: 'ghost', size: 'md', onClick: fn() },
  argTypes: {
    icon: { control: 'select', options: Object.keys(icons) },
    variant: { control: 'inline-radio', options: ['ghost', 'filled', 'prominent'] },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    shape: { control: 'inline-radio', options: ['round', 'square'] },
    tooltip: { control: 'inline-radio', options: ['top', 'bottom', 'left', 'right', false] },
  },
  decorators: [(S) => <div style={{ padding: 40 }}><S /></div>],
} satisfies Meta<typeof IconButton>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Ghost: Story = {};
export const Filled: Story = { args: { variant: 'filled', icon: 'fit', label: 'Recadrer' } };
export const Prominent: Story = { args: { variant: 'prominent', size: 'lg', icon: 'play', label: 'Faire tourner' } };

export const Bascule: Story = {
  render: function Render(args) {
    const [on, setOn] = useState(true);
    return <IconButton {...args} pressed={on} onClick={() => setOn(!on)} />;
  },
};
