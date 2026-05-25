import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite reads VITE_*-prefixed env vars at build time and inlines them. The
// docker-compose layer passes VITE_API_BASE_URL as a build arg so the same
// image can target different backends in dev / staging / prod.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
  },
});
