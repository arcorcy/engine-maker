import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: /^@ds$/, replacement: fileURLToPath(new URL('./src/design-system/index.ts', import.meta.url)) },
      { find: /^@ds\//, replacement: fileURLToPath(new URL('./src/design-system/', import.meta.url)) },
    ],
  },
});
