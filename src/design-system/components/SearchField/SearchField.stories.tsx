import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { SearchField } from './SearchField';

const meta = {
  title: 'Composants/SearchField',
  component: SearchField,
  tags: ['autodocs'],
  args: { label: 'Rechercher une pièce', placeholder: 'Rechercher une pièce', value: '', onChange: () => {} },
  decorators: [(S) => <div style={{ maxWidth: 300 }}><S /></div>],
  render: function Render(args) {
    const [v, setV] = useState(args.value);
    return <SearchField {...args} value={v} onChange={setV} />;
  },
} satisfies Meta<typeof SearchField>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Vide: Story = {};
export const Rempli: Story = { args: { value: 'soupape' } };
