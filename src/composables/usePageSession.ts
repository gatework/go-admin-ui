import { onActivated, onBeforeUnmount, onDeactivated, watch } from 'vue'
import { useUserStore } from '@/stores/user'

export interface PageSession {
  /** Whether the page is on screen and still belongs to the account that opened it. */
  readonly active: boolean
  /** Aborted when the page leaves or the account changes. Pass to requests. */
  readonly signal: AbortSignal
  /**
   * Captures "now"; the returned function says whether a response that arrives
   * later still belongs here. Call it before the request, check it after.
   */
  guard: () => () => boolean
}

export interface PageSessionOptions {
  /** The page left the screen or the account changed: close dialogs, drop selections. */
  onSuspend?: () => void
  /** The page came back after being suspended: reload what may be stale. */
  onResume?: () => void
}

/**
 * The lifetime of a kept-alive page's requests.
 *
 * A page under keep-alive is not unmounted when the reader moves on, so a
 * request it started can resolve into a page nobody is looking at -- or, after
 * signing out and in again, into another account's page. Each network page
 * used to carry its own `active` flag, generation counter and token
 * comparison; this is that logic, once.
 *
 *   const session = usePageSession({ onSuspend: closeDialogs, onResume: reload })
 *   const current = session.guard()
 *   const response = await listThing(query, session.signal)
 *   if (!current()) return
 */
export function usePageSession(options: PageSessionOptions = {}): PageSession {
  const user = useUserStore()
  let active = true
  let generation = 0
  let controller = new AbortController()

  const suspend = () => {
    if (!active) return
    active = false
    generation++
    controller.abort()
    options.onSuspend?.()
  }
  const resume = () => {
    if (active) return
    active = true
    controller = new AbortController()
    options.onResume?.()
  }

  // A new token is a new account as far as any in-flight response is concerned.
  // The page stays suspended until it is next activated: what it shows was the
  // previous account's, and signing in again navigates, which remounts or
  // reactivates the page with a clean start.
  watch(() => user.token, suspend)
  onActivated(resume)
  onDeactivated(suspend)
  onBeforeUnmount(suspend)

  return {
    get active() { return active },
    get signal() { return controller.signal },
    guard: () => {
      const started = generation
      const token = user.token
      return () => active && started === generation && user.token === token
    }
  }
}
