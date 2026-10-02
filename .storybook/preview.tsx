import type { Preview } from '@storybook/react-vite';
import { withThemeByDataAttribute } from '@storybook/addon-themes';
import '../src/design-system/tokens/tokens.css';
import '../src/design-system/tokens/base.css';
import './preview.css';

const preview: Preview = {
  parameters: {
    layout: 'padded',
    controls: { expanded: true, matchers: { color: /(background|color)$/i } },
    options: {
      storySort: { order: ['Fondations', ['Introduction', 'Couleurs', 'Typographie', 'Espacements et rayons', 'Mouvement'], 'Composants', 'Application'] },
    },
    a11y: { test: 'todo' },
    docs: { toc: true },
  },
  decorators: [
    withThemeByDataAttribute({ themes: { Clair: 'light', Sombre: 'dark' }, defaultTheme: 'Clair', attributeName: 'data-theme' }),
  ],
};
export default preview;
