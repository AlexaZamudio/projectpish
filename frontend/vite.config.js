import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Durante el desarrollo, redirige /api al backend de Express (puerto 4000),
// para no tener problemas de CORS ni manejar URLs absolutas.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
