import { computed, nextTick, onActivated, onBeforeUnmount, onDeactivated, reactive, ref, watch } from 'vue'
import { updateSettings } from '@/api/network/fabric'
import { useUserStore } from '@/stores/user'
import type { Fabric } from '@/types/network-fabric'
import type { useOperation } from './use-operation'

type Settings = Pick<Fabric, 'version' | 'collectionEnabled' | 'runtimeMinutes' | 'configMinutes'>
function snapshot(fabric: Settings): Settings {
  return { version: fabric.version, collectionEnabled: fabric.collectionEnabled, runtimeMinutes: fabric.runtimeMinutes, configMinutes: fabric.configMinutes }
}
function isConflict(error: unknown) {
  const failure = error as { code?: number, response?: { status?: number }} | null
  return failure?.code === 409 || failure?.response?.status === 409
}

export function useSettings(fabric: () => Fabric, visible: () => boolean, allowed: () => boolean, operation: ReturnType<typeof useOperation>, refresh: (() => Promise<void>) | undefined, changed: () => void) {
  const user = useUserStore()
  const ownerToken = user.token
  const settings = reactive(snapshot(fabric()))
  const baseline = ref(snapshot(fabric()))
  const latest = ref(snapshot(fabric()))
  const conflict = ref(false)
  const reloading = ref(false)
  const reloadFailed = ref(false)
  let generation = 0
  const active = ref(visible())
  const dirty = computed(() => settings.collectionEnabled !== baseline.value.collectionEnabled || settings.runtimeMinutes !== baseline.value.runtimeMinutes || settings.configMinutes !== baseline.value.configMinutes)
  const outdated = computed(() => latest.value.version > baseline.value.version)
  const valid = computed(() => [settings.runtimeMinutes, settings.configMinutes].every(value => Number.isInteger(value) && value >= 1 && value <= 1440))
  const blocked = computed(() => conflict.value || reloading.value || !active.value || !visible())
  function apply(value: Settings) {
    Object.assign(settings, snapshot(value)); baseline.value = snapshot(value)
    conflict.value = false; reloadFailed.value = false
  }
  function reconcile() {
    if (active.value && visible() && outdated.value && !dirty.value && !conflict.value && !operation.pending.value && !reloading.value) apply(latest.value)
  }
  watch([dirty, operation.pending, reloading], reconcile)
  function invalidate() {
    generation++; active.value = false; reloading.value = false; operation.invalidate()
  }
  watch(() => fabric().id, () => {
    invalidate(); latest.value = snapshot(fabric()); apply(latest.value); active.value = visible() && user.token === ownerToken
  }, { flush: 'sync' })
  watch(() => snapshot(fabric()), value => {
    if (!active.value || value.version <= latest.value.version) return
    latest.value = value
    if (!dirty.value && !conflict.value && !operation.pending.value && !reloading.value) apply(value)
  }, { flush: 'sync' })
  function resume() {
    active.value = visible() && user.token === ownerToken
    if (!active.value) return
    if (fabric().version > latest.value.version) latest.value = snapshot(fabric())
    if (!dirty.value && !conflict.value && !operation.pending.value) apply(latest.value)
  }
  watch(visible, value => { if (value) resume(); else invalidate() }, { flush: 'sync' })
  watch(() => user.token, invalidate, { flush: 'sync' })
  onActivated(resume)
  onBeforeUnmount(invalidate)
  onDeactivated(invalidate)
  async function save() {
    if (blocked.value || !allowed() || !valid.value) return
    const id = fabric().id
    const payload = snapshot(settings)
    await operation.run(() => updateSettings(id, payload), response => {
      if (response.data.id !== id) return
      const saved = snapshot(response.data)
      if (saved.version >= latest.value.version) latest.value = saved
      apply(latest.value)
      changed()
    }, error => { if (isConflict(error)) conflict.value = true })
  }
  async function reload() {
    if (!active.value || !visible() || operation.pending.value || reloading.value) return
    const current = generation
    reloading.value = true; reloadFailed.value = false
    try {
      // An already observed newer version is authoritative; otherwise join the
      // detail owner's queue, which may retain old props on refresh failure.
      if (!outdated.value) { await refresh?.(); await nextTick() }
      if (current !== generation) return
      if (latest.value.version > baseline.value.version) apply(latest.value)
      else reloadFailed.value = true
    } catch { if (current === generation) reloadFailed.value = true } finally { if (current === generation) reloading.value = false }
  }
  return { settings, dirty, outdated, conflict, reloading, reloadFailed, valid, blocked, save, reload }
}
