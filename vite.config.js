import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://192.168.0.9:8080',
        changeOrigin: true,
        ws: true, // this enables WebSocket proxying
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
