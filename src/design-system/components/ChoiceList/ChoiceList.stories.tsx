import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Badge } from '../Badge/Badge';
import { ChoiceList } from './ChoiceList';

const meta = {
  title: 'Composants/ChoiceList',
  component: ChoiceList,
  tags: ['autodocs'],
  decorators: [(S) => <div style={{ maxWidth: 420 }}><S /></div>],
} satisfies Meta<typeof ChoiceList>;
export default meta;

export const Variantes: StoryObj<typeof meta> = {
  args: {
    label: 'Bloc-cylindres',
    value: 'bloc-79',
    onChange: () => {},
    choices: [
      { value: 'bloc-79', title: "Bloc d'origine, alésage 79 mm", description: 'Fonte, entraxe 88 mm entre cylindres.' },
      { value: 'bloc-80-5', title: 'Bloc réalésé à 80,5 mm', description: 'Plus de cylindrée, parois un peu plus fines.', meta: <Badge tone="accent">+3 pièces</Badge>, extra: 'Remplace pistons, segments et joint.' },
      { value: 'bloc-90', title: 'Bloc 90 mm', description: 'Pour une autre famille de moteurs.', disabledReason: 'Ne convient pas : entraxe trop court.' },
    ],
  },
  render: function Render(args) {
    const [v, setV] = useState(args.value);
    return <ChoiceList {...args} value={v} onChange={setV} />;
  },
};
