import { defineConfig } from 'vite';

export default defineConfig({
  root: './frontend',
  server: {
    port: 5173,
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true
      },
      '/api': {
        target: 'http://localhost:3000'
      }
    }
  },
  build: {
    outDir: '../frontend/dist',
    emptyOutDir: true
  }
});
