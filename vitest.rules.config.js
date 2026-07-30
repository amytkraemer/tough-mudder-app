import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: {
    include: ['test/**/*.emulator.test.js'],
    testTimeout: 20000,
    hookTimeout: 40000,
  },
})
