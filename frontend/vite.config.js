import { defineConfig } from 'vite';

export default defineConfig({
  root: './frontend',
  server: {
    port: 5173,
    proxy: {
      '/socket.io': { target: 'http://localhost:3000', ws: true },
      '/api': { target: 'http://localhost:3000' }
    }
  },
  build: {
    outDir: '../frontend/dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          const moduleId = String(id).replaceAll('\\', '/');
          if (moduleId.includes('/node_modules/three/')) return 'vendor-three';
          if (moduleId.includes('/node_modules/pixi.js/') || moduleId.includes('/node_modules/@pixi/')) return 'vendor-pixi';
          if (moduleId.includes('/node_modules/socket.io-client/') || moduleId.includes('/node_modules/engine.io-client/')) return 'vendor-socket';
          return undefined;
        }
      }
    }
  }
});