import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 15_000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
  },
  webServer: {
    command: 'node --env-file=.env src/server.js',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
  },
});
