import type { Meta, StoryObj } from '@storybook/react-vite';
import { Icon } from './Icon';
import { icons, type IconName } from './icons';

const meta = {
  title: 'Composants/Icon',
  component: Icon,
  tags: ['autodocs'],
  args: { name: 'play', size: 24 },
  argTypes: { name: { control: 'select', options: Object.keys(icons) } },
} satisfies Meta<typeof Icon>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Catalogue: Story = {
  render: (args) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(104px, 1fr))', gap: 8 }}>
      {(Object.keys(icons) as IconName[]).map((n) => (
        <div
          key={n}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '18px 8px',
            borderRadius: 12, background: 'var(--color-fill)', font: 'var(--text-footnote)', color: 'var(--color-label-secondary)',
          }}
        >
          <span style={{ color: 'var(--color-label)' }}><Icon {...args} name={n} /></span>
          {n}
        </div>
      ))}
    </div>
  ),
};
