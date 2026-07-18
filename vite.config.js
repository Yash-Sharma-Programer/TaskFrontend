import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { '/api': 'http://localhost:5000', '/uploads': 'http://localhost:5000' } },
  test: { environment: 'jsdom', setupFiles: './src/test/setup.js', include: ['src/**/*.{test,spec}.{js,jsx}'], css: true },
  build: { rollupOptions: { output: { manualChunks: { react: ['react', 'react-dom', 'react-router-dom'], query: ['@tanstack/react-query', 'axios', 'zustand'], charts: ['recharts'], dnd: ['@dnd-kit/core', '@dnd-kit/sortable'] } } } }
});
