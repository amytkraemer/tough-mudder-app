import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: {
    include: ['test/**/*.emulator.test.js'],
    testTimeout: 20000,
    hookTimeout: 40000,
    // All emulator files hit ONE shared Firestore instance and call
    // clearFirestore() in beforeEach; running them in parallel lets one file's
    // clear wipe another's data mid-test. Force fully serial execution.
    fileParallelism: false,
    sequence: { concurrent: false },
  },
})
