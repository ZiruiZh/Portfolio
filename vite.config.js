import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// In dev, Vite answers /zeen/ with the site's own index.html. Point it at the
// built prototype in public/zeen instead, like Vercel and vite preview do.
const zeenIndex = {
  name: 'zeen-index',
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      if (req.url === '/zeen' || req.url?.startsWith('/zeen/?') || req.url === '/zeen/') {
        req.url = '/zeen/index.html' + (req.url.split('?')[1] ? '?' + req.url.split('?')[1] : '');
      }
      next();
    });
  },
};

export default defineConfig({
  plugins: [zeenIndex],
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        original: resolve(import.meta.dirname, 'testi-physics.html'),
      },
    },
  },
});
