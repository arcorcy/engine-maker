import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Slider } from '../Slider/Slider';
import { Icon } from '../Icon/Icon';
import { Menu, MenuItem, MenuRow, MenuSeparator } from './Menu';

const meta = {
  title: 'Composants/Menu',
  component: Menu,
  tags: ['autodocs'],
  args: { label: 'Autres outils', children: null },
  decorators: [
    (S) => (
      <div style={{ padding: '200px 120px 24px', display: 'flex', justifyContent: 'center' }}>
        <S />
      </div>
    ),
  ],
} satisfies Meta<typeof Menu>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Outils: Story = {
  render: function Render(args) {
    const [t, setT] = useState({ cut: true, xray: false });
    const [ex, setEx] = useState(30);
    return (
      <Menu {...args}>
        <MenuRow>
          <Icon name="explode" size={18} />
          <Slider label="Vue éclatée" hideLabel value={ex} onChange={setEx} style={{ width: 140 }} />
        </MenuRow>
        <MenuSeparator />
        <MenuItem icon="cut" label="Vue en coupe" checked={t.cut} keepOpen onSelect={() => setT({ ...t, cut: !t.cut })} />
        <MenuItem icon="xray" label="Transparence" checked={t.xray} keepOpen onSelect={() => setT({ ...t, xray: !t.xray })} />
        <MenuSeparator />
        <MenuItem icon="fit" label="Recadrer" onSelect={() => {}} />
      </Menu>
    );
  },
};
