import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import vitePluginCesium from 'vite-plugin-cesium';

export default defineConfig({
  plugins: [react(), vitePluginCesium()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ''),
      },
    },
  },
});
