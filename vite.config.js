import { defineConfig } from 'vite';

// GitHub Pages serves the site from /fantasy-world/; local dev stays at /.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/fantasy-world/' : '/',
}));
