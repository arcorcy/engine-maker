import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@ds/tokens/tokens.css';
import '@ds/tokens/base.css';
import { App } from './app/App';
import { applyStoredTheme } from './app/useTheme';

applyStoredTheme();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
