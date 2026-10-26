<template>
  <section class="mfa-settings" :aria-label="t('accountAccess.mfa')">
    <header><h3>{{ t('accountAccess.mfa') }}</h3><p>{{ t('accountAccess.mfaDesc') }}</p></header>
    <a-spin v-if="loading" />
    <a-alert v-else-if="failed" type="error">{{ t('accountAccess.loadFailed') }}<a-button type="text" @click="load">{{ t('accountAccess.retry') }}</a-button></a-alert>
    <template v-else-if="codes.length">
      <h4>{{ t('accountAccess.codesTitle') }}</h4><a-alert type="warning">{{ t('accountAccess.codesDesc') }}</a-alert>
      <ul class="recovery-codes"><li v-for="code in codes" :key="code"><code>{{ code }}</code></li></ul>
      <div class="mfa-actions"><a-button @click="download">{{ t('accountAccess.download') }}</a-button><a-button type="primary" @click="signIn">{{ t('accountAccess.done') }}</a-button></div>
    </template>
    <template v-else-if="status">
      <a-alert v-if="!status.configured" type="warning">{{ t('accountAccess.mfaUnavailable') }}</a-alert>
      <template v-else>
        <div class="mfa-status"><a-tag :color="status.enabled ? 'green' : undefined">{{ t(status.enabled ? 'accountAccess.mfaOn' : 'accountAccess.mfaOff') }}</a-tag><span v-if="status.enabled">{{ t('accountAccess.remaining', { n: status.recoveryCodesRemaining }) }}</span></div>
        <template v-if="enrollment">
          <p>{{ t('accountAccess.setupDesc') }}</p><img class="mfa-qr" :src="enrollment.qr" :alt="t('accountAccess.setup')" width="240" height="240">
          <label class="manual-key">{{ t('accountAccess.secret') }}<code>{{ enrollment.secret }}</code></label>
          <a-form ref="formRef" :disabled="busy" :model="form" layout="vertical" @submit-success="enable">
            <a-form-item field="code" :label="t('accountAccess.otp')" :rules="[{ required: true, length: 6, message: t('accountAccess.required') }]"><a-input v-model="form.code" :max-length="6" :input-attrs="{ 'aria-label': t('accountAccess.otp'), 'autocomplete': 'one-time-code', 'inputmode': 'numeric' }" /></a-form-item>
            <div class="mfa-actions"><a-button type="primary" html-type="submit" :loading="busy">{{ t('accountAccess.enable') }}</a-button><a-button :disabled="busy" @click="cancel">{{ t('accountAccess.cancel') }}</a-button></div>
          </a-form>
        </template>
        <a-form v-else ref="formRef" :disabled="busy" :model="form" layout="vertical" @submit-success="submit">
          <a-form-item field="password" :label="t('accountAccess.currentPassword')" :rules="[{ required: true, message: t('accountAccess.required') }]"><a-input-password v-model="form.password" :input-attrs="{ 'aria-label': t('accountAccess.currentPassword'), 'autocomplete': 'current-password' }" /></a-form-item>
          <template v-if="status.enabled">
            <a-form-item field="code" :label="t(recoveryMode ? 'accountAccess.recovery' : 'accountAccess.otp')" :rules="[{ required: true, message: t('accountAccess.required') }]"><a-input v-model="form.code" :max-length="recoveryMode ? 32 : 6" :input-attrs="{ 'aria-label': t(recoveryMode ? 'accountAccess.recovery' : 'accountAccess.otp'), 'autocomplete': recoveryMode ? 'off' : 'one-time-code' }" /></a-form-item>
            <a-button type="text" class="mfa-mode" @click="recoveryMode = !recoveryMode; form.code = ''">{{ t(recoveryMode ? 'accountAccess.useOTP' : 'accountAccess.useRecovery') }}</a-button>
            <a-radio-group v-model="operation" :disabled="busy" type="button"><a-radio value="regenerate">{{ t('accountAccess.regenerate') }}</a-radio><a-radio value="disable">{{ t('accountAccess.disableMFA') }}</a-radio></a-radio-group>
          </template>
          <a-button type="primary" html-type="submit" :status="status.enabled && operation === 'disable' ? 'danger' : undefined" :loading="busy">{{ t(!status.enabled ? 'accountAccess.setup' : operation === 'disable' ? 'accountAccess.disableMFA' : 'accountAccess.regenerate') }}</a-button>
        </a-form>
      </template>
    </template>
  </section>
</template>
<script setup lang="ts">
import { onMounted, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useRouter, onBeforeRouteLeave } from 'vue-router'
import { Message, type FormInstance } from '@arco-design/web-vue'
import { useFormLocale } from '@/composables/useFormLocale'
import { useI18n } from 'vue-i18n'
import { mfaStatus, setupMFA, changeMFA, type MFAStatus, type Enrollment } from '@/api/account-access'
import { useUserStore } from '@/stores/user'
const emit = defineEmits<{ protected: [value: boolean] }>()
const formRef = ref<FormInstance>()
useFormLocale(formRef)
const { t } = useI18n(); const router = useRouter(); const user = useUserStore()
const status = ref<MFAStatus>(); const enrollment = ref<Enrollment>(); const codes = ref<string[]>([])
const form = reactive({ password: '', code: '' }); const operation = ref<'disable' | 'regenerate'>('regenerate'); const recoveryMode = ref(false)
const loading = ref(true); const busy = ref(false); const failed = ref(false)
watch([busy, codes], () => emit('protected', busy.value || codes.value.length > 0), { immediate: true })
onBeforeRouteLeave(() => {
  if (busy.value || codes.value.length) { Message.info(t('accountAccess.finishSecurity')); return false }
})
function protectUnload(event: BeforeUnloadEvent) {
  if (busy.value || codes.value.length) { event.preventDefault(); event.returnValue = '' }
}
onBeforeUnmount(() => window.removeEventListener('beforeunload', protectUnload))
async function load() { loading.value = true; failed.value = false; try { status.value = (await mfaStatus()).data } catch { failed.value = true } finally { loading.value = false } }
async function signIn() { codes.value = []; await user.resetToken(); await router.replace('/login') }
async function submit() {
  if (busy.value) return
  busy.value = true
  const requestedOperation = operation.value
  const payload = { password: form.password, ...(recoveryMode.value ? { recoveryCode: form.code } : { code: form.code }) }
  try {
    if (!status.value?.enabled) enrollment.value = (await setupMFA(payload.password)).data
    else {
      const result = await changeMFA(requestedOperation, payload)
      if (requestedOperation === 'disable') { busy.value = false; await signIn() } else codes.value = result.data.recoveryCodes || []
    }
    form.password = ''; form.code = ''
  } catch { /* Shared request reports failures. */ } finally { busy.value = false }
}
async function enable() { if (busy.value) return; busy.value = true; try { const result = await changeMFA('enable', { code: form.code }); codes.value = result.data.recoveryCodes || []; enrollment.value = undefined; form.code = '' } catch { /* Shared request reports failures. */ } finally { busy.value = false } }
async function cancel() { if (busy.value) return; busy.value = true; try { await changeMFA('cancel'); enrollment.value = undefined; form.code = '' } catch { /* Shared request reports failures. */ } finally { busy.value = false } }
function download() { const url = URL.createObjectURL(new Blob([codes.value.join('\n') + '\n'], { type: 'text/plain' })); const link = document.createElement('a'); link.href = url; link.download = 'motor-recovery-codes.txt'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000) }
onMounted(() => { window.addEventListener('beforeunload', protectUnload); void load() })
</script>
<style scoped lang="scss">
.mfa-settings { max-width: 760px; margin-top: 24px; padding: 24px 0 0; border-top: 1px solid var(--motor-border); }
h3 { margin: 0 0 8px; } p, .mfa-status { color: var(--motor-text-2); line-height: 1.7; } header { margin-bottom: 20px; }
.mfa-status, .mfa-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 20px; }
.mfa-qr { display: block; max-width: 100%; height: auto; background: white; margin: 20px auto; }
.manual-key { display: grid; gap: 8px; margin-bottom: 24px; } .manual-key code { overflow-wrap: anywhere; user-select: all; }
.recovery-codes { list-style: none; padding: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin: 20px 0; } .recovery-codes code { overflow-wrap: anywhere; user-select: all; }
.mfa-mode { margin-bottom: 16px; } .arco-radio-group { display: flex; flex-wrap: wrap; margin-bottom: 20px; }
@media (max-width: 767px) { .mfa-settings { padding-top: 20px; } .recovery-codes { grid-template-columns: 1fr; } }
</style>
