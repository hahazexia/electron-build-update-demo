import { defineConfig, normalizePath } from 'vite';
import path from 'path';
import { nodeResolve } from '@rollup/plugin-node-resolve';

export default defineConfig({
  root: path.resolve(__dirname, 'src/main'),
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: false,
    target: 'node22',
    lib: {
      entry: ['preload.ts'],
      formats: ['cjs'],
      fileName: (format, entryName) => {
        return `${entryName}.js`;
      },
    },
    rollupOptions: {
      external: ['electron'],
      plugins: [
        nodeResolve({
          preferBuiltins: true,
          browser: false,
        }),
      ],
      output: {
        entryFileNames: 'preload.js',
        format: 'cjs',
      },
    },
  },
});
