import base from './playwright.config'
export default { ...base, use: { ...base.use, baseURL: 'http://localhost:9538' }, webServer: { ...base.webServer, command: 'pnpm dev --host --port 9538', url: 'http://127.0.0.1:9538' } }
