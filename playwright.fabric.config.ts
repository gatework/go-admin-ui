import { defineConfig } from '@playwright/test'
import base from './playwright.config'

// Keep this focused suite independent of sync-apps: the development workspace
// may contain unrelated generated application changes that must be preserved.
const existing = process.env.FABRIC_UI_URL
export default defineConfig({
  ...base,
  use: { ...base.use, baseURL: existing || 'http://localhost:9530' },
  projects: [{ name: 'mocked', testMatch: /mocked\/network-fabric\.spec\.ts$/ }],
  webServer: existing ? undefined : {
    command: 'pnpm exec vite --host 127.0.0.1 --port 9530 --strictPort',
    url: 'http://127.0.0.1:9530',
    reuseExistingServer: false,
    env: { VUE_APP_LOCALE: '' },
    timeout: 120000
  }
})
