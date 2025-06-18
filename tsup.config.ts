import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/client.ts', 'src/payment-server.ts'],
  format: ['esm'],
  dts: false,
  splitting: false,
  sourcemap: true,
  clean: true,
  target: 'esnext',
  platform: 'node',
  outDir: 'build',
  banner: {
    js: '#!/usr/bin/env node',
  },
})
