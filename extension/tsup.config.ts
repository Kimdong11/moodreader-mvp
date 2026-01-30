import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    background: 'src/background/index.ts',
    content: 'src/content/index.ts'
  },
  format: ['iife'],
  outDir: 'dist',
  clean: false, // Vite handles clean, or set true based on flow
  splitting: false,
  outExtension() {
    return {
      js: '.js',
    }
  }
});
