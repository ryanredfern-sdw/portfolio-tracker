import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // …any other Vite options you already have…

  preview: {
    allowedHosts: true,
  },
});
