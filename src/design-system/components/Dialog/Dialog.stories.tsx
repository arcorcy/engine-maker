import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { fn } from 'storybook/test';
import { Button } from '../Button/Button';
import { Dialog } from './Dialog';

const meta = {
  title: 'Composants/Dialog',
  component: Dialog,
  tags: ['autodocs'],
  args: {
    open: false,
    title: 'Supprimer « 1.6 préparé piste » ?',
    message: 'Ce moteur et son historique seront supprimés. Cette action est définitive.',
    confirmLabel: 'Supprimer',
    destructive: true,
    onConfirm: fn(),
    onCancel: fn(),
  },
  render: function Render(args) {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button variant="destructive" icon="trash" onClick={() => setOpen(true)}>Supprimer</Button>
        <Dialog {...args} open={open} onConfirm={() => { args.onConfirm(); setOpen(false); }} onCancel={() => { args.onCancel(); setOpen(false); }} />
      </>
    );
  },
} satisfies Meta<typeof Dialog>;
export default meta;

export const Destructif: StoryObj<typeof meta> = {};
export const Confirmation: StoryObj<typeof meta> = {
  args: { title: 'Revenir au moteur de référence ?', message: 'Toutes les pièces reprendront leur version d’origine.', confirmLabel: 'Réinitialiser', destructive: false },
};
