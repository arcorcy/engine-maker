import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { TextField } from './TextField';

const meta = {
  title: 'Composants/TextField',
  component: TextField,
  tags: ['autodocs'],
  args: { label: 'Nom du moteur', value: '1.6 préparé piste', onChange: () => {} },
  argTypes: { variant: { control: 'inline-radio', options: ['default', 'title'] } },
  decorators: [(S) => <div style={{ maxWidth: 360 }}><S /></div>],
  render: function Render(args) {
    const [v, setV] = useState(args.value);
    return <TextField {...args} value={v} onChange={setV} />;
  },
} satisfies Meta<typeof TextField>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Titre: Story = { args: { variant: 'title', hideLabel: true } };
export const Erreur: Story = { args: { value: '', error: 'Donnez un nom à ce moteur.' } };
