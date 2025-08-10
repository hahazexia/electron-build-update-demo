import { defineConfig, normalizePath } from 'vite';
import path from 'path';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { viteStaticCopy } from 'vite-plugin-static-copy';

const nodeBuiltins = [
  'node:http',
  'node:https',
  'node:fs',
  'node:fs/promises',
  'node:path',
  'node:url',
  'node:child_process',
  'module',
];

export default defineConfig({
  root: path.resolve(__dirname, 'src/main'),
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: normalizePath(path.resolve(__dirname, 'src/renderer/*')),
          dest: './',
        },
      ],
    }),
  ],
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: false,
    target: 'node22',
    lib: {
      entry: ['index.ts'],
      formats: ['es'],
      fileName: (format, entryName) => {
        return `${entryName}.js`;
      },
    },
    rollupOptions: {
      external: [
        ...nodeBuiltins,
        'electron',
        'electron-log',
        'dotenv',
        'electron-updater',
        'iconv-lite',
        'better-sqlite3',
      ],
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
        entryFileNames: 'index.js',
        format: 'es',
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
