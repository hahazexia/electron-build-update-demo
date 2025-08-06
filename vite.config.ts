import { defineConfig } from 'vite';
import path from 'path';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

const nodeBuiltins = [
  'node:fs',
  'node:path',
  'node:url',
  'os',
  'events',
  'util',
  'node:child_process',
  'module',
  'assert',
];

export default defineConfig({
  root: path.resolve(__dirname, 'src/main'),
  build: {
    outDir: path.resolve(__dirname, 'dist/main'),
    emptyOutDir: true,
    target: 'node22',
    lib: {
      entry: ['index.ts', 'preload.ts'],
      formats: ['es'],
      fileName: (_, entryName) => `${entryName}.js`,
    },
    rollupOptions: {
      external: [...nodeBuiltins, 'electron'],
      plugins: [
        nodeResolve({
          preferBuiltins: true,
          browser: false,
        }),
        commonjs({
          include: /node_modules/,
          esmExternals: true,
        }),
      ],
      output: {
        format: 'es',
        banner: `import { createRequire } from 'module'; const require = createRequire(import.meta.url);`,
        externalLiveBindings: true,
        globals: {
          electron: 'electron',
        },
        sourcemap: true,
        sourcemapExcludeSources: false,
      },
    },
  },
});
