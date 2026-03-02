import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  // …any other Vite options you already have…
  preview: {
    // Allow any Render domain for this service
    allowedHosts: ['*.onrender.com'],
    // or, if you prefer the exact host:
    // allowedHosts: ['portfolio-frontend-xxrb.onrender.com'],
  },
});
