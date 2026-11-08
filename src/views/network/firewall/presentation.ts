import type { Binding, Input, NormalizedRow } from '@/types/firewall'
export function positiveId(value: unknown): number | undefined { const text = typeof value === 'number' ? String(value) : value; if (typeof text !== 'string' || !/^[1-9]\d*$/.test(text)) return; const id = Number(text); return Number.isSafeInteger(id) ? id : undefined }
export const requestKey = () => crypto.randomUUID()
export const running = (status?: string) => status === 'queued' || status === 'running'
export function correctedInput(rows: NormalizedRow[]): Input { return { defaultProtocol: 'tcp', rows: rows.map(({ key, source, destination, service, notes }) => ({ key, source, destination, service, notes })) } }
export function visibleFields(record: Record<string, unknown>): { name: string, value: string }[] {
  return Object.entries(record).filter(([key]) => !/command|^rendered|^scripts?$|^cli$/i.test(key)).map(([name, value]) => ({ name, value: displayValue(value) }))
}
function displayValue(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (Array.isArray(value)) return value.map(displayValue).join(', ')
  if (typeof value === 'object') return Object.entries(value).filter(([key]) => !/command|^rendered|^scripts?$|^cli$/i.test(key)).map(([key, item]) => `${key}: ${displayValue(item)}`).join(' · ')
  return String(value)
}
export function createReadOwner() {
  let generation = 0; let active = true; let controller = new AbortController()
  return {
    async run<T>(read: (signal: AbortSignal) => Promise<T>, apply: (value: T) => void) {
      if (!active) return
      controller.abort(); controller = new AbortController(); const own = ++generation
      try { const result = await read(controller.signal); if (active && own === generation) apply(result) } catch(error) { if (active && own === generation) throw error }
    },
    stop() { active = false; generation++; controller.abort() },
    resume() { active = true }
  }
}
// An uncertain transport outcome must retry the same server intent.
export function createIntentKey() {
  let basis = ''; let key = ''
  return {
    for(value: string) { if (!key || basis !== value) { basis = value; key = requestKey() }; return key },
    accepted() { key = '' }
  }
}

export function newZoneBinding(): Binding { return { zone: '', scope: '', routingScope: '', domainId: 0, protected: true, networks: [] } }

export function stateTone(state: string) {
  if (['allowed', 'verified', 'succeeded', 'ready', 'complete'].includes(state)) return 'green'
  if (['failed', 'denied', 'invalid'].includes(state)) return 'red'
  if (['running', 'queued'].includes(state)) return 'blue'
  return 'orange'
}
