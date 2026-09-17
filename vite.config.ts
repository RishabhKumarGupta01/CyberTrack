process.env.VITE_CONFIG_NATIVE_IGNORE_WARNING = 'true';
import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { app as expressApp } from './server/app';

function expressApiPlugin(): Plugin {
  return {
    name: 'express-api-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url && (req.url.startsWith('/api/') || req.url === '/api')) {
          return expressApp(req, res, next);
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    expressApiPlugin(),
  ],
  server: {
    port: 5173,
    open: false,
  },
});

