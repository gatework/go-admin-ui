<template>
  <div class="lock-settings">
    <p class="lock-settings__state">
      <a-tag :color="lock.configured ? 'green' : 'gray'">{{ $t(lock.configured ? 'settings.lock.status.ready' : 'settings.lock.status.off') }}</a-tag>
      <span>{{ $t('settings.lock.local.description') }}</span>
    </p>
    <a-space v-if="lock.configured" wrap>
      <a-button type="primary" @click="lockNow"><template #icon><icon-lock /></template>{{ $t('settings.lock.now') }}</a-button>
      <a-button @click="show('change')">{{ $t('settings.lock.change') }}</a-button>
      <a-button status="danger" @click="show('disable')">{{ $t('settings.lock.disable') }}</a-button>
    </a-space>
    <a-button v-else type="primary" :disabled="!supported" @click="show('configure')">
      <template #icon><icon-safe /></template>{{ $t('settings.lock.configure') }}
    </a-button>
    <p class="lock-settings__note">{{ $t(supported ? 'settings.lock.notice' : 'settings.lock.crypto.unavailable') }}</p>

    <AppModal v-model:visible="dialog.visible" :title="$t(`settings.lock.dialog.${dialog.mode}.title`)" :width="420" :mask-closable="false" :closable="!saving" @close="reset">
      <p class="lock-settings__intro">{{ $t(`settings.lock.dialog.${dialog.mode}.description`) }}</p>
      <a-form :model="form" layout="vertical" @submit-success="submit">
        <a-form-item v-if="dialog.mode !== 'configure'" field="current" :label="$t('settings.lock.password.current')">
          <a-input-password v-model="form.current" autocomplete="off" :disabled="saving" :placeholder="$t('settings.lock.password.current.placeholder')" />
        </a-form-item>
        <template v-if="dialog.mode !== 'disable'">
          <a-form-item field="password" :label="$t('settings.lock.password.new')">
            <a-input-password v-model="form.password" autocomplete="new-password" :disabled="saving" :placeholder="$t('settings.lock.password.rule')" />
          </a-form-item>
          <a-form-item field="confirmation" :label="$t('settings.lock.password.confirm')">
            <a-input-password v-model="form.confirmation" autocomplete="new-password" :disabled="saving" :placeholder="$t('settings.lock.password.confirm.placeholder')" />
          </a-form-item>
          <a-checkbox v-if="dialog.mode === 'configure'" v-model="form.lockImmediately">{{ $t('settings.lock.immediately') }}</a-checkbox>
        </template>
      </a-form>
      <template #footer>
        <a-button :disabled="saving" @click="dialog.visible = false">{{ $t('settings.cancel') }}</a-button>
        <a-button type="primary" :status="dialog.mode === 'disable' ? 'danger' : 'normal'" :loading="saving" @click="submit">{{ $t(`settings.lock.dialog.${dialog.mode}.action`) }}</a-button>
      </template>
    </AppModal>
  </div>
</template>

<script setup lang="ts">
/**
 * The local screen lock: set, change or remove its password, or lock now.
 *
 * The password never leaves the browser; the store keeps a derived verifier.
 */
import { reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AppModal from '@/components/AppModal/index.vue'
import { useLockScreenStore } from '@/stores/lock-screen'
import { usePreferencesStore } from '@/stores/preferences'
import { isLockScreenSupported, validateLockPassword } from '@/utils/lock-screen'
import { msgError, msgSuccess } from '@/utils/message'

defineOptions({ name: 'LockSettings' })
type Mode = 'configure' | 'change' | 'disable'

const { t } = useI18n()
const lock = useLockScreenStore()
const preferences = usePreferencesStore()
const supported = isLockScreenSupported()
const saving = ref(false)
const dialog = reactive({ visible: false, mode: 'configure' as Mode })
const form = reactive({ current: '', password: '', confirmation: '', lockImmediately: true })

const reset = () => Object.assign(form, { current: '', password: '', confirmation: '', lockImmediately: true })
const show = (mode: Mode) => { reset(); dialog.mode = mode; dialog.visible = true }
const lockNow = () => { preferences.closeSettings(); lock.lock() }

/** The first thing wrong with the form, as an i18n key. */
const problem = () => {
  if (dialog.mode !== 'disable' && !validateLockPassword(form.password)) return 'settings.lock.password.rule'
  if (dialog.mode !== 'disable' && form.password !== form.confirmation) return 'settings.lock.password.mismatch'
  if (dialog.mode !== 'configure' && !form.current) return 'settings.lock.password.current.required'
}

const submit = async() => {
  if (saving.value) return
  const invalid = problem()
  if (invalid) return msgError(t(invalid))
  saving.value = true
  try {
    const ok = dialog.mode === 'configure'
      ? await lock.configure(form.password, form.lockImmediately)
      : dialog.mode === 'change'
        ? await lock.changePassword(form.current, form.password)
        : await lock.disable(form.current)
    if (!ok) return msgError(t('settings.lock.password.incorrect'))
    msgSuccess(t(`settings.lock.dialog.${dialog.mode}.success`))
    dialog.visible = false
    if (lock.locked) preferences.closeSettings()
  } catch {
    msgError(t('settings.lock.crypto.unavailable'))
  } finally {
    saving.value = false
  }
}
</script>

<style lang="scss" scoped>
.lock-settings__state { display: flex; align-items: center; gap: 8px; margin: 0 0 12px; color: var(--motor-text-2); }
.lock-settings__note,
.lock-settings__intro { margin: 12px 0 0; color: var(--motor-text-3); font-size: var(--motor-font-size-12); line-height: 1.7; }
.lock-settings__intro { margin: 0 0 16px; font-size: var(--motor-font-size-13); }
</style>
