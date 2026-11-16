import type { DeliveryDraft, DeliveryOptions, DeliveryOrder, DeliveryPayload, DeviceSnapshot, DraftTarget } from '@/types/network-delivery'

export const normalizeScript = (script: string) => script.replace(/\r\n?/g, '\n').trim()
export const scriptLines = (script: string) => normalizeScript(script).split('\n').filter(line => line.trim() && !line.trimStart().startsWith('#')).length
export const emptyDraft = (): DeliveryDraft => ({ version: 0, title: '', requestKey: crypto.randomUUID(), targets: [] })
export const deviceName = (device: DeviceSnapshot) => device.name || device.hostname || device.ip
export const isSubmissionUncertain = (code: unknown) => typeof code !== 'number' || code >= 500
// A terminal order's version identifies one immutable set of failed targets.
// Returning to it after a lost response must recover the same linked retry.
export const retryRequestKey = (order: Pick<DeliveryOrder, 'id' | 'version'>) => `delivery-retry-${order.id}-v${order.version}`

export function reconcileTargets(current: DraftTarget[], devices: DeviceSnapshot[], commonScript: string): DraftTarget[] {
  const previous = new Map(current.map(target => [target.deviceId, target.script]))
  return devices.map(device => ({ deviceId: device.id, device: { ...device }, script: previous.get(device.id) ?? commonScript }))
}
export function fromOrder(order: DeliveryOrder): DeliveryDraft {
  return { ...emptyDraft(), id: order.id, version: order.version, title: order.title, targets: (order.targets || []).map(target => ({ deviceId: target.deviceId, device: { ...target.device }, script: target.script })) }
}
export function toPayload(draft: Pick<DeliveryDraft, 'title' | 'targets'>): DeliveryPayload {
  return { title: draft.title.trim(), targets: draft.targets.map(target => ({ deviceId: target.deviceId, script: normalizeScript(target.script), ...(target.device.profile ? { expectedProfile: target.device.profile } : {}), ...(target.device.deviceRole !== undefined ? { expectedDeviceRole: target.device.deviceRole } : {}), ...(target.device.deviceType !== undefined ? { expectedDeviceType: target.device.deviceType } : {}) })) }
}
export function validateDraft(draft: Pick<DeliveryDraft, 'title' | 'targets'>, limits: Pick<DeliveryOptions, 'maxTargets' | 'maxScriptBytes'>): string | undefined {
  if (!draft.title.trim()) return 'titleRequired'
  if (!draft.targets.length) return 'noDevices'
  if (draft.targets.length > limits.maxTargets) return 'tooManyTargets'
  if (new Set(draft.targets.map(target => target.deviceId)).size !== draft.targets.length) return 'duplicateDevice'
  let total = 0
  for (const target of draft.targets) {
    if (target.needsReview) return 'changedDevice'
    const script = normalizeScript(target.script)
    if (!scriptLines(script)) return 'emptyScript'
    if (script.includes('\0') || /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(script)) return 'invalidScript'
    const bytes = new TextEncoder().encode(script).byteLength
    if (bytes > limits.maxScriptBytes) return 'scriptTooLarge'
    total += bytes
  }
  if (total > 4 * 1024 * 1024) return 'scriptsTooLarge'
}
