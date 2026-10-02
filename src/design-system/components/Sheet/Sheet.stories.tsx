import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { fn } from 'storybook/test';
import { Button } from '../Button/Button';
import { ChoiceList } from '../ChoiceList/ChoiceList';
import { TextField } from '../TextField/TextField';
import { Sheet } from './Sheet';

const meta = {
  title: 'Composants/Sheet',
  component: Sheet,
  tags: ['autodocs'],
  args: { open: false, title: 'Nouveau moteur', description: 'Choisissez une architecture.', onClose: fn(), children: null },
  render: function Render(args) {
    const [open, setOpen] = useState(false);
    const [v, setV] = useState('l4');
    const [name, setName] = useState('L4 1.6');
    return (
      <>
        <Button variant="primary" icon="plus" onClick={() => setOpen(true)}>Nouveau moteur</Button>
        <Sheet
          {...args}
          open={open}
          onClose={() => setOpen(false)}
          onSubmit={() => setOpen(false)}
          footer={
            <>
              <Button onClick={() => setOpen(false)}>Annuler</Button>
              <Button variant="primary" type="submit">Créer</Button>
            </>
          }
        >
          <div style={{ display: 'grid', gap: 16 }}>
            <TextField label="Nom" value={name} onChange={setName} />
            <ChoiceList
              label="Architecture"
              value={v}
              onChange={setV}
              choices={[
                { value: 'l4', title: 'L4 1.6', description: '4 cylindres en ligne, 1 598 cm³' },
                { value: 'v8', title: 'V8 5.0', description: 'V8 à 90°, 4 951 cm³' },
                { value: 'v12', title: 'V12 6.5', description: 'V12 à 60°, 6 496 cm³' },
              ]}
            />
          </div>
        </Sheet>
      </>
    );
  },
} satisfies Meta<typeof Sheet>;
export default meta;

export const Creation: StoryObj<typeof meta> = {};
