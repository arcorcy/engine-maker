import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../Button/Button';
import { Tooltip } from './Tooltip';

const meta = {
  title: 'Composants/Tooltip',
  component: Tooltip,
  tags: ['autodocs'],
  args: { label: 'Maj + glisser pour déplacer', side: 'top', children: null },
  argTypes: { side: { control: 'inline-radio', options: ['top', 'bottom', 'left', 'right'] } },
  decorators: [(S) => <div style={{ padding: 60, display: 'flex', justifyContent: 'center' }}><S /></div>],
  render: (args) => (
    <Tooltip {...args}>
      <Button>Survolez-moi</Button>
    </Tooltip>
  ),
} satisfies Meta<typeof Tooltip>;
export default meta;
export const Default: StoryObj<typeof meta> = {};
