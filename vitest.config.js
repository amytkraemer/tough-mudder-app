import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: {
    // emulator-backed tests run via `npm run test:rules`, not the default suite
    exclude: ['**/node_modules/**', '**/*.emulator.test.js'],
  },
})
