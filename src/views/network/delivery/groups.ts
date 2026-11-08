import type { DeviceSnapshot, DraftTarget } from '@/types/network-delivery'
import { normalizeScript } from './form'

export interface ScriptGroup {
  key: string
  deviceRole: string
  deviceType: string
  profile: string
  targets: DraftTarget[]
}

export function groupKey(device: DeviceSnapshot): string {
  // Old snapshots without a platform remain separate until their identity is known.
  if (!device.profile) return `device:${device.id}`
  return JSON.stringify([device.deviceRole ? 'role' : 'type', device.deviceRole || device.deviceType || '', device.profile])
}

export function buildGroups(targets: DraftTarget[]): ScriptGroup[] {
  const groups = new Map<string, ScriptGroup>()
  for (const target of targets) {
    const key = groupKey(target.device)
    let group = groups.get(key)
    if (!group) {
      group = { key, deviceRole: target.device.deviceRole || '', deviceType: target.device.deviceType || '', profile: target.device.profile || '', targets: [] }
      groups.set(key, group)
    }
    group.targets.push(target)
  }
  return [...groups.values()]
}

export function initializeGroupScripts(targets: DraftTarget[]): Record<string, string> {
  const scripts: Record<string, string> = {}
  for (const group of buildGroups(targets)) {
    const counts = new Map<string, { count: number, script: string }>()
    for (const target of group.targets) {
      const key = normalizeScript(target.script)
      const item = counts.get(key) || { count: 0, script: target.script }
      item.count++
      counts.set(key, item)
    }
    const common = [...counts.values()].sort((a, b) => b.count - a.count)[0].script
    scripts[group.key] = common
    for (const target of group.targets) target.individual = normalizeScript(target.script) !== normalizeScript(common)
  }
  return scripts
}

export function updateGroupScript(targets: DraftTarget[], scripts: Record<string, string>, key: string, script: string) {
  scripts[key] = script
  for (const target of targets) if (groupKey(target.device) === key && !target.individual) target.script = script
}

export function setIndividualScript(target: DraftTarget, individual: boolean, scripts: Record<string, string>) {
  target.individual = individual
  if (!individual) { target.script = scripts[groupKey(target.device)] || ''; target.needsReview = false }
}

export function reconcileGroupedTargets(current: DraftTarget[], devices: DeviceSnapshot[], scripts: Record<string, string>, cache: Map<number, DraftTarget>): DraftTarget[] {
  const previous = new Map([...cache, ...current.map(target => [target.deviceId, target] as const)])
  return devices.map(device => {
    const old = previous.get(device.id)
    const key = groupKey(device)
    if (old && groupKey(old.device) === key) return { ...old, device: { ...device }, script: old.individual ? old.script : scripts[key] ?? old.script }
    if (old?.script) return { ...old, device: { ...device }, individual: true, needsReview: true }
    return { deviceId: device.id, device: { ...device }, script: scripts[key] || '', individual: false }
  })
}
