<template>
  <main class="access-page">
    <aside class="access-story"><RouterLink to="/login"><Brand /></RouterLink><div><IconSafe :size="48" /><h2>{{ t('accountAccess.mfa') }}</h2><p>{{ t('accountAccess.mfaDesc') }}</p></div><Footer /></aside>
    <section class="access-panel">
      <div class="access-tools"><LangSelect /><HeaderIconButton :title="t(preferences.darkMode ? 'settings.navbar.theme.toLight' : 'settings.navbar.theme.toDark')" @click="preferences.toggleTheme()"><IconSun v-if="preferences.darkMode" /><IconMoon v-else /></HeaderIconButton></div>
      <div class="access-form">
        <h1>{{ t(`accountAccess.${mode}`) }}</h1><p class="description">{{ t(`accountAccess.${mode}Desc`) }}</p>
        <a-spin v-if="checking" />
        <a-alert v-else-if="policyFailed" type="error">{{ t('accountAccess.policyUnavailable') }}<a-button type="text" @click="loadPolicy">{{ t('accountAccess.retry') }}</a-button></a-alert>
        <a-alert v-else-if="success" type="success">{{ success }}</a-alert>
        <a-alert v-else-if="blocked" type="warning">{{ blocked }}</a-alert>
        <a-form v-else ref="formRef" :model="form" :disabled="busy" layout="vertical" :rules="rules" @submit-success="submit">
          <template v-if="mode === 'register'">
            <a-form-item field="username" :label="t('accountAccess.username')"><a-input v-model="form.username" :max-length="64" :input-attrs="{ 'aria-label': t('accountAccess.username'), 'autocomplete': 'username' }" /></a-form-item>
            <a-form-item field="name" :label="t('accountAccess.name')"><a-input v-model="form.name" :max-length="128" :input-attrs="{ 'aria-label': t('accountAccess.name'), 'autocomplete': 'name' }" /></a-form-item>
          </template>
          <a-form-item field="email" :label="t('accountAccess.email')"><a-input v-model="form.email" :disabled="mode === 'reset'" :max-length="128" :input-attrs="{ 'aria-label': t('accountAccess.email'), 'autocomplete': 'email', 'inputmode': 'email' }" @input="emailChanged" /></a-form-item>
          <template v-if="mode !== 'forgot'">
            <a-form-item field="code" :label="t('accountAccess.code')"><div class="email-code"><a-input v-model="form.code" :max-length="6" :input-attrs="{ 'aria-label': t('accountAccess.code'), 'autocomplete': 'one-time-code', 'inputmode': 'numeric' }" /><a-button v-if="mode === 'register'" :loading="sending" :disabled="cooldown > 0 || !validEmail" @click="sendCode">{{ cooldown ? t('accountAccess.resend', { n: cooldown }) : t('accountAccess.send') }}</a-button></div></a-form-item>
            <a-alert v-if="emailSent" type="info" class="email-hint">{{ t('accountAccess.sent') }}</a-alert>
            <a-form-item field="password" :label="t('accountAccess.password')" :extra="t('accountAccess.passwordRule')"><a-input-password v-model="form.password" :max-length="72" :input-attrs="{ 'aria-label': t('accountAccess.password'), 'autocomplete': 'new-password' }" /></a-form-item>
            <a-form-item field="passwordConfirmation" :label="t('accountAccess.confirm')"><a-input-password v-model="form.passwordConfirmation" :max-length="72" :input-attrs="{ 'aria-label': t('accountAccess.confirm'), 'autocomplete': 'new-password' }" /></a-form-item>
          </template>
          <a-button type="primary" html-type="submit" long :loading="busy" :disabled="mode === 'register' && !form.token">{{ t(`accountAccess.${mode}`) }}</a-button>
        </a-form>
        <RouterLink class="login-link" to="/login">{{ t('accountAccess.login') }}</RouterLink>
        <RouterLink v-if="mode === 'reset' && blocked && !success" class="login-link" to="/forgot-password">{{ t('accountAccess.forgot') }}</RouterLink>
      </div>
    </section>
  </main>
</template>
<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, reactive, ref, watch } from 'vue'
import type { FormInstance } from '@arco-design/web-vue'
import { useFormLocale } from '@/composables/useFormLocale'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { IconSafe, IconSun, IconMoon } from '@arco-design/web-vue/es/icon'
import Brand from '@/components/brand/index.vue'
import Footer from '@/components/footer/index.vue'
import LangSelect from '@/components/LangSelect/index.vue'
import HeaderIconButton from '@/components/header-icon-button/index.vue'
import { usePreferencesStore } from '@/stores/preferences'
import { accessSettings, sendRegistrationEmail, registerAccount, forgotPassword, resetPassword, type AccessSettings } from '@/api/account-access'
defineOptions({ name: 'AccountAccess' })
const { t } = useI18n(); const route = useRoute(); const preferences = usePreferencesStore()
const mode = computed(() => route.path === '/register' ? 'register' : route.path === '/reset-password' ? 'reset' : 'forgot')
const form = reactive({ username: '', name: '', email: String(route.query.email || ''), password: '', passwordConfirmation: '', token: String(route.query.token || ''), code: '' })
const policy = ref<AccessSettings>(); const policyFailed = ref(false); const checking = ref(true); const busy = ref(false); const sending = ref(false); const cooldown = ref(0); const emailSent = ref(false); const success = ref('')
const formRef = ref<FormInstance>()
useFormLocale(formRef)
let generation = 0
watch(() => route.fullPath, () => {
  generation++; busy.value = false; sending.value = false
  Object.assign(form, { username: '', name: '', email: String(route.query.email || ''), password: '', passwordConfirmation: '', token: String(route.query.token || ''), code: '' })
  success.value = ''; emailSent.value = false; cooldown.value = 0; clearInterval(timer); formRef.value?.clearValidate()
})
let timer: ReturnType<typeof setInterval> | undefined
const validEmail = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
const blocked = computed(() => mode.value === 'register' && !policy.value?.enabled ? t('accountAccess.disabled') : !policy.value?.emailConfigured ? t('accountAccess.unavailable') : mode.value === 'reset' && (!form.token || !form.email) ? t('accountAccess.invalidLink') : '')
const rules = computed(() => ({
  username: [{ required: true, message: t('accountAccess.required') }], name: [{ required: true, message: t('accountAccess.required') }],
  email: [{ required: true, message: t('accountAccess.required') }, { type: 'email' as const, message: t('accountAccess.emailInvalid') }],
  code: [{ required: true, length: 6, message: t('accountAccess.required') }],
  password: [{ validator: (value: string, callback: (error?: string) => void) => { const length = new TextEncoder().encode(value).length; callback(length < 12 || length > 72 ? t('accountAccess.passwordRule') : undefined) } }],
  passwordConfirmation: [{ validator: (value: string, callback: (error?: string) => void) => callback(value !== form.password ? t('accountAccess.mismatch') : undefined) }]
}))
function emailChanged() { if (mode.value === 'register') { form.token = ''; form.code = ''; emailSent.value = false } }
async function loadPolicy() { checking.value = true; policyFailed.value = false; try { policy.value = (await accessSettings()).data } catch { policyFailed.value = true } finally { checking.value = false } }
async function sendCode() {
  if (sending.value || cooldown.value || !validEmail.value) return
  sending.value = true
  const email = form.email; const current = generation
  try {
    const response = await sendRegistrationEmail(email)
    if (current !== generation) return
    if (form.email === email) { form.token = response.data.token; emailSent.value = true }
    cooldown.value = response.data.resendAfter
    clearInterval(timer)
    timer = setInterval(() => { if (current !== generation || --cooldown.value <= 0) clearInterval(timer) }, 1000)
  } catch { /* Shared request reports failures. */ } finally { if (current === generation) sending.value = false }
}
async function submit() {
  if (busy.value) return
  busy.value = true
  const current = generation; const requestedMode = mode.value; const payload = { ...form }
  try {
    if (requestedMode === 'register') await registerAccount(payload)
    else if (requestedMode === 'forgot') await forgotPassword(payload.email)
    else await resetPassword(payload)
    if (current !== generation) return
    success.value = t(requestedMode === 'register' ? 'accountAccess.registered' : requestedMode === 'forgot' ? 'accountAccess.resetSent' : 'accountAccess.resetDone')
    form.password = ''; form.passwordConfirmation = ''; form.code = ''; form.token = ''
  } catch { /* Shared request reports failures. */ } finally { if (current === generation) busy.value = false }
}
onMounted(loadPolicy)
onBeforeUnmount(() => { generation++; clearInterval(timer) })
</script>
<style scoped lang="scss">
.access-page { min-height: 100dvh; display: grid; grid-template-columns: minmax(300px, 0.8fr) minmax(440px, 1.2fr); background: var(--motor-surface); color: var(--motor-text-1); }
.access-story { display: flex; flex-direction: column; justify-content: space-between; gap: 40px; padding: 32px 48px; background: var(--motor-surface-soft); border-right: 1px solid var(--motor-border); }
.access-story > div { max-width: 380px; } .access-story > a { text-decoration: none; }
.access-story h2 { font-size: 30px; line-height: 1.3; margin: 24px 0 12px; } .access-story p { color: var(--motor-text-2); line-height: 1.8; }
.access-panel { padding: 24px 40px 48px; } .access-tools { display: flex; justify-content: flex-end; gap: 8px; }
.access-form { max-width: 420px; margin: 48px auto 0; } h1 { font-size: 28px; margin: 0 0 12px; } .description { line-height: 1.7; color: var(--motor-text-2); margin: 0 0 28px; }
.email-code { display: flex; gap: 8px; width: 100%; } .email-code > :first-child { min-width: 0; } .email-code .arco-btn { flex-shrink: 0; }
.email-hint { margin-bottom: 20px; } .login-link { display: inline-block; margin-top: 24px; margin-right: 16px; color: var(--motor-primary); }
@media (max-width: 767px) { .access-page { display: block; } .access-story { display: none; } .access-panel { padding: 16px 24px 40px; } .access-form { margin-top: 32px; } }
</style>
