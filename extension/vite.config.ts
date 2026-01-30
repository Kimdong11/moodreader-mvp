import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  base: './', // Relative paths for extension
  build: {
    outDir: 'dist',
    emptyOutDir: false, // Do not clear tsup's output
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'popup.html'),
        player: resolve(__dirname, 'player.html'),
        options: resolve(__dirname, 'options.html')
      },
      output: {
        entryFileNames: 'js/[name].js',
        chunkFileNames: 'js/[name].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
});
