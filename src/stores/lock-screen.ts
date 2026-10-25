import { defineStore } from 'pinia'
import { LOCK_SCREEN_STORAGE_KEY } from '@/config/app-meta'
import {
  createLockSalt,
  deriveLockVerifier,
  LOCK_PASSWORD_ITERATIONS,
  lockVerifierMatches,
  validateLockPassword
} from '@/utils/lock-screen'
import type { LockScreenState, PersistedLockScreen } from '@/types/lock-screen'

const initialState = (): LockScreenState => ({
  configured: false,
  locked: false,
  salt: '',
  verifier: '',
  iterations: LOCK_PASSWORD_ITERATIONS,
  configuredAt: undefined
})

const isPersistedLockScreen = (
  value: unknown
): value is PersistedLockScreen => {
  if (!value || typeof value !== 'object') return false
  const lock = value as Partial<PersistedLockScreen>
  return (
    lock.version === 1 &&
    typeof lock.locked === 'boolean' &&
    typeof lock.salt === 'string' &&
    lock.salt.length > 0 &&
    typeof lock.verifier === 'string' &&
    lock.verifier.length > 0 &&
    typeof lock.iterations === 'number' &&
    Number.isInteger(lock.iterations) && lock.iterations >= 100_000 && lock.iterations <= 1_000_000 &&
    typeof lock.configuredAt === 'string'
  )
}

const useLockScreenStore = defineStore('lock-screen', {
  state: initialState,

  actions: {
    hydrate() {
      try {
        const raw = localStorage.getItem(LOCK_SCREEN_STORAGE_KEY)
        if (!raw) return
        const persisted = JSON.parse(raw) as unknown
        if (!isPersistedLockScreen(persisted)) {
          try { localStorage.removeItem(LOCK_SCREEN_STORAGE_KEY) } catch { /* Storage may be disabled. */ }
          return
        }
        this.$patch({
          configured: true,
          locked: persisted.locked,
          salt: persisted.salt,
          verifier: persisted.verifier,
          iterations: persisted.iterations,
          configuredAt: persisted.configuredAt
        })
      } catch {
        try { localStorage.removeItem(LOCK_SCREEN_STORAGE_KEY) } catch { /* Storage may be disabled. */ }
      }
    },

    persist() {
      if (!this.configured) {
        try { localStorage.removeItem(LOCK_SCREEN_STORAGE_KEY) } catch { /* Storage may be disabled. */ }
        return
      }
      const persisted: PersistedLockScreen = {
        version: 1,
        locked: this.locked,
        salt: this.salt,
        verifier: this.verifier,
        iterations: this.iterations,
        configuredAt: this.configuredAt || new Date().toISOString()
      }
      try { localStorage.setItem(LOCK_SCREEN_STORAGE_KEY, JSON.stringify(persisted)) } catch { /* Keep the current tab usable without persistence. */ }
    },

    async configure(password: string, lockImmediately = false) {
      if (!validateLockPassword(password)) return false
      const salt = createLockSalt()
      const verifier = await deriveLockVerifier(
        password,
        salt,
        LOCK_PASSWORD_ITERATIONS
      )
      this.$patch({
        configured: true,
        locked: lockImmediately,
        salt,
        verifier,
        iterations: LOCK_PASSWORD_ITERATIONS,
        configuredAt: new Date().toISOString()
      })
      this.persist()
      return true
    },

    async verify(password: string) {
      if (!this.configured) return false
      return lockVerifierMatches(
        password,
        this.salt,
        this.verifier,
        this.iterations
      )
    },

    async unlock(password: string) {
      if (!(await this.verify(password))) return false
      this.locked = false
      this.persist()
      return true
    },

    lock() {
      if (!this.configured) return false
      this.locked = true
      this.persist()
      return true
    },

    async changePassword(currentPassword: string, newPassword: string) {
      if (!(await this.verify(currentPassword))) return false
      return this.configure(newPassword, false)
    },

    async disable(currentPassword: string) {
      if (!(await this.verify(currentPassword))) return false
      this.clear()
      return true
    },

    clear() {
      this.$patch(initialState())
      try { localStorage.removeItem(LOCK_SCREEN_STORAGE_KEY) } catch { /* Storage may be disabled. */ }
    }
  }
})

export { useLockScreenStore }
