import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 10000,
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      '@asi-types': path.resolve(__dirname, './types'),
      '@asi-types/index': path.resolve(__dirname, './types/index.ts'),
      '@/*': path.resolve(__dirname, './src/*'),
      '@agents/*': path.resolve(__dirname, './agents/*'),
      '@tools/*': path.resolve(__dirname, './tools/*'),
      '@core/*': path.resolve(__dirname, './core/*'),
      '@ui/*': path.resolve(__dirname, './ui/*'),
    },
  },
});