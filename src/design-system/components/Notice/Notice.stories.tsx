import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../Button/Button';
import { Notice } from './Notice';

const meta = {
  title: 'Composants/Notice',
  component: Notice,
  tags: ['autodocs'],
  args: { tone: 'info', title: '3 pièces remplacées pour rester compatibles' },
  argTypes: { tone: { control: 'inline-radio', options: ['neutral', 'info', 'success', 'warning', 'danger'] } },
  decorators: [(S) => <div style={{ maxWidth: 420 }}><S /></div>],
} satisfies Meta<typeof Notice>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Remplacements: Story = {
  args: {
    action: <Button variant="plain" size="sm">Annuler</Button>,
    children: (
      <ul>
        <li>Pistons : cote réparation 80,5 mm</li>
        <li>Segments : 80,5 mm</li>
        <li>Joint : grand alésage</li>
      </ul>
    ),
  },
};
export const Avertissement: Story = {
  args: { tone: 'warning', title: 'Rapport volumétrique de 11,6', children: <p>Risque de cliquetis, carburant 98 obligatoire.</p> },
};
export const Erreur: Story = {
  args: { tone: 'danger', title: 'Le piston dépasse du bloc', children: <p>Raccourcir la bielle ou prendre des pistons à axe remonté.</p> },
};
export const Succes: Story = { args: { tone: 'success', title: 'Moteur cohérent', children: <p>Aucun problème détecté.</p> } };
