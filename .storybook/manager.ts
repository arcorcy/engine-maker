import { addons } from 'storybook/manager-api';
import { create } from 'storybook/theming';

addons.setConfig({
  theme: create({
    base: 'light',
    brandTitle: 'Anatomie moteur · Design system',
    fontBase: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Inter', sans-serif",
    colorPrimary: '#0071e3',
    colorSecondary: '#0071e3',
    appBg: '#f5f5f7',
    appContentBg: '#ffffff',
    appBorderRadius: 12,
    inputBorderRadius: 8,
    textColor: '#1d1d1f',
    barSelectedColor: '#0071e3',
  }),
});
