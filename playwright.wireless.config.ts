import { defineConfig } from '@playwright/test'
import base from './playwright.config'
export default defineConfig({ ...base, use: { ...base.use, baseURL: 'http://localhost:9531' }, projects: [{ name: 'mocked', testMatch: /mocked\/network-wireless\.spec\.ts$/ }], webServer: { command: 'pnpm exec vite --host 127.0.0.1 --port 9531 --strictPort', url: 'http://127.0.0.1:9531', reuseExistingServer: false, env: { VUE_APP_LOCALE: '' }, timeout: 120000 } })
