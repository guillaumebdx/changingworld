import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.PORT ?? 3001}`,
        changeOrigin: false,
      },
    },
    fs: {
      // Le paquet partagé est un lien symbolique hors de apps/admin
      allow: ['..', '../..'],
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
