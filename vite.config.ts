
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // Adicionado fallback para string vazia para evitar erro de sintaxe se a env não existir no build
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || '')
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    commonjsOptions: {
      transformMixedEsModules: true
    }
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3000'
    }
  }
});
