import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, KeepAlive, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useUserStore } from '@/stores/user'
import { usePageSession, type PageSession } from '@/composables/usePageSession'

let session: PageSession
const onSuspend = vi.fn()
const onResume = vi.fn()

const Page = defineComponent({
  name: 'SessionPage',
  setup() {
    session = usePageSession({ onSuspend, onResume })
    return () => h('div')
  }
})

/** A kept-alive page that can be switched away from and back to. */
const mountKeptAlive = () => {
  const shown = ref(true)
  const wrapper = mount(defineComponent({ setup: () => () => h(KeepAlive, null, { default: () => shown.value ? h(Page) : h('span') }) }))
  return { wrapper, shown }
}

beforeEach(() => {
  setActivePinia(createPinia())
  useUserStore().token = 'first'
  onSuspend.mockClear()
  onResume.mockClear()
})

describe('usePageSession', () => {
  it('accepts a response that arrives while the page is still on screen', () => {
    mountKeptAlive()
    const current = session.guard()
    expect(current()).toBe(true)
    expect(session.signal.aborted).toBe(false)
  })

  it('rejects a response once the page has been switched away from, and aborts its requests', async() => {
    const { shown } = mountKeptAlive()
    const current = session.guard()
    const signal = session.signal
    shown.value = false
    await nextTick()
    expect(current()).toBe(false)
    expect(signal.aborted).toBe(true)
    expect(onSuspend).toHaveBeenCalledOnce()
  })

  it('resumes with a fresh signal when the page comes back, but old responses stay rejected', async() => {
    const { shown } = mountKeptAlive()
    const stale = session.guard()
    shown.value = false
    await nextTick()
    shown.value = true
    await nextTick()
    expect(onResume).toHaveBeenCalledOnce()
    expect(session.active).toBe(true)
    expect(session.signal.aborted).toBe(false)
    expect(stale()).toBe(false)
    expect(session.guard()()).toBe(true)
  })

  // Signing out and in again without leaving the page: the response belongs to the previous account.
  it('rejects a response that started under another account', async() => {
    mountKeptAlive()
    const current = session.guard()
    useUserStore().token = 'second'
    await nextTick()
    expect(current()).toBe(false)
    expect(session.guard()()).toBe(true)
  })

  it('stays suspended after sign-out', async() => {
    mountKeptAlive()
    useUserStore().token = ''
    await nextTick()
    expect(session.active).toBe(false)
    expect(onResume).not.toHaveBeenCalled()
  })
})
