/* eslint-disable vue/one-component-per-file -- mounted lifecycle owners */
import { defineComponent, h, KeepAlive, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useSession } from '@/views/network/wireless/session'
import { useUserStore } from '@/stores/user'
const visibility = (hidden: boolean) => { Object.defineProperty(document, 'hidden', { configurable: true, value: hidden }); document.dispatchEvent(new Event('visibilitychange')) }
beforeEach(() => { setActivePinia(createPinia()); visibility(false) })
afterEach(() => visibility(false))
function owner() {
  const shown = ref(true); let session!: ReturnType<typeof useSession>
  const child = defineComponent({ setup() { session = useSession(); return () => h('div') } })
  const wrapper = mount(defineComponent({ setup: () => () => h(KeepAlive, () => shown.value ? h(child) : null) }))
  return { shown, session, wrapper }
}
it('does not reactivate a cached page when the browser becomes visible', async() => {
  const { shown, session, wrapper } = owner()
  shown.value = false; await nextTick(); visibility(true); visibility(false)
  expect(session.active.value).toBe(false)
  const work = vi.fn(); await session.run(work); expect(work).not.toHaveBeenCalled()
  shown.value = true; await nextTick(); expect(session.active.value).toBe(true)
  wrapper.unmount()
})
it('aborts and discards a pending response across hidden/resume', async() => {
  const { session, wrapper } = owner(); let finish!: (value: string) => void; let signal!: AbortSignal
  const pending = session.run(value => { signal = value; return new Promise<string>(resolve => { finish = resolve }) })
  visibility(true); expect(signal.aborted).toBe(true); visibility(false)
  finish('old'); expect(await pending).toBeUndefined()
  expect(await session.run(async() => 'new')).toBe('new'); wrapper.unmount()
})
it('rejects work immediately after an account switch and cannot resume the old owner', async() => {
  const { session, wrapper } = owner(); useUserStore().token = 'different-account'
  const work = vi.fn(); await session.run(work); visibility(true); visibility(false)
  expect(work).not.toHaveBeenCalled(); expect(session.active.value).toBe(false); wrapper.unmount()
})
it('does not start work while the initial document is hidden', async() => {
  visibility(true); const { session, wrapper } = owner(); const work = vi.fn()
  await session.run(work); expect(work).not.toHaveBeenCalled(); wrapper.unmount()
})
