import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // relative paths for GitHub Pages subfolder and local desktop support
  server: {
    port: 3300,
    open: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false
  }
});
