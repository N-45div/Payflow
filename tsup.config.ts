import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  target: 'esnext',
  platform: 'node',
  outDir: 'build',  // Changed from default 'dist' to 'build'
  banner: {
    js: '#!/usr/bin/env node',
  },
})
