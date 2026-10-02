import type { Meta, StoryObj } from '@storybook/react-vite';
import { systemColors } from '../../tokens';
import { Button } from '../Button/Button';
import { SectionHeader } from './SectionHeader';

const meta = {
  title: 'Composants/SectionHeader',
  component: SectionHeader,
  tags: ['autodocs'],
  args: { children: 'Distribution' },
  decorators: [(S) => <div style={{ maxWidth: 300 }}><S /></div>],
} satisfies Meta<typeof SectionHeader>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Simple: Story = {};
export const AvecSysteme: Story = {
  args: { dot: systemColors.yellow, action: <Button variant="plain" size="sm">Isoler</Button> },
};
