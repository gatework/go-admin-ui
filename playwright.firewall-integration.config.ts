import { defineConfig } from '@playwright/test'
import base from './playwright.config'
process.env.FIREWALL_INTEGRATION = '1'
export default defineConfig({
  ...base,
  timeout: 60000,
  use: { ...base.use, baseURL: 'http://localhost:9539' },
  projects: [{ name: 'firewall-integration', testMatch: /network-firewall\.integration\.spec\.ts$/ }],
  webServer: [
    { command: 'go run ./app/firewall/integration/cmd -addr 127.0.0.1:18039 -origin http://localhost:9539', cwd: '../go-admin', url: 'http://127.0.0.1:18039/__fixture', reuseExistingServer: false, timeout: 120000 },
    { command: 'pnpm dev --host --port 9539', url: 'http://127.0.0.1:9539', reuseExistingServer: false, env: { VUE_APP_LOCALE: '', VUE_APP_BASE_API: 'http://localhost:18039' }, timeout: 120000 }
  ]
})
