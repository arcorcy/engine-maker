import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { IconButton } from '../IconButton/IconButton';
import { Slider } from '../Slider/Slider';
import { Toolbar, ToolbarGroup, ToolbarSeparator } from './Toolbar';

const meta = {
  title: 'Composants/Toolbar',
  component: Toolbar,
  tags: ['autodocs'],
  args: { label: 'Outils de la vue', children: null },
  decorators: [
    (S) => (
      <div style={{ padding: '80px 24px 24px', borderRadius: 24, background: 'linear-gradient(var(--color-canvas-top), var(--color-canvas-bottom))', display: 'flex', justifyContent: 'center' }}>
        <S />
      </div>
    ),
  ],
} satisfies Meta<typeof Toolbar>;
export default meta;
type Story = StoryObj<typeof meta>;

export const VueMoteur: Story = {
  render: function Render(args) {
    const [play, setPlay] = useState(false);
    const [ex, setEx] = useState(0);
    const [t, setT] = useState({ cut: true, xray: false, gas: true });
    return (
      <Toolbar {...args}>
        <IconButton icon={play ? 'pause' : 'play'} label={play ? 'Pause' : 'Faire tourner'} variant="prominent" onClick={() => setPlay(!play)} />
        <ToolbarSeparator />
        <Slider label="Éclaté" hideLabel value={ex} onChange={setEx} style={{ width: 120, padding: '0 8px' }} />
        <ToolbarSeparator />
        <ToolbarGroup>
          <IconButton icon="cut" label="Coupe" pressed={t.cut} onClick={() => setT({ ...t, cut: !t.cut })} />
          <IconButton icon="xray" label="Transparence" pressed={t.xray} onClick={() => setT({ ...t, xray: !t.xray })} />
          <IconButton icon="gas" label="Gaz" pressed={t.gas} onClick={() => setT({ ...t, gas: !t.gas })} />
        </ToolbarGroup>
        <ToolbarSeparator />
        <IconButton icon="fit" label="Recadrer" />
      </Toolbar>
    );
  },
};
