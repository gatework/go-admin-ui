<template>
  <AccessShell :title="t(`accountAccess.${mode}`)" :description="success ? undefined : t(`accountAccess.${mode}Desc`)" :registration="mode === 'register'">
    <template #actions>
      <a-tooltip :content="t('accountAccess.login')">
        <RouterLink class="back-to-login" to="/login" :aria-label="t('accountAccess.login')"><IconArrowLeft aria-hidden="true" /></RouterLink>
      </a-tooltip>
    </template>
    <a-spin v-if="checking" class="policy-loader" :aria-label="t('common.loading')" />
    <a-alert v-else-if="policyFailed" type="error">
      {{ t('accountAccess.policyUnavailable') }}
      <template #action><a-button type="text" @click="loadPolicy">{{ t('accountAccess.retry') }}</a-button></template>
    </a-alert>
    <template v-else-if="success">
      <div class="access-success" role="status" aria-live="polite" aria-atomic="true">
        <IconCheckCircleFill class="access-success__icon" aria-hidden="true" />
        <div>
          <h2 ref="successHeading" tabindex="-1">{{ t(success === 'forgot' ? 'accountAccess.mailSentTitle' : success === 'register' ? 'accountAccess.registeredTitle' : 'accountAccess.resetDoneTitle') }}</h2>
          <p>{{ t(success === 'register' ? 'accountAccess.registered' : success === 'forgot' ? 'accountAccess.resetSent' : 'accountAccess.resetDone') }}</p>
          <small v-if="success === 'forgot'">{{ t('accountAccess.checkInbox') }}</small>
        </div>
        <ol v-if="success === 'forgot'">
          <li>{{ t('accountAccess.stepLink') }}</li>
          <li>{{ t('accountAccess.stepCode') }}</li>
          <li>{{ t('accountAccess.stepPassword') }}</li>
        </ol>
      </div>
      <div class="access-actions">
        <a-button v-if="success === 'forgot'" type="text" @click="editEmail">{{ t('accountAccess.editEmail') }}</a-button>
        <a-button v-else type="primary" @click="router.push('/login')">{{ t('accountAccess.login') }}</a-button>
      </div>
    </template>
    <template v-else-if="blocked">
      <a-alert type="warning">{{ blocked }}</a-alert>
      <div v-if="mode === 'reset'" class="access-actions"><RouterLink to="/forgot-password">{{ t('accountAccess.forgot') }}</RouterLink></div>
    </template>
    <a-form v-else ref="formRef" :model="form" :disabled="busy" :aria-busy="busy" size="large" layout="vertical" :rules="rules" @submit="submit">
      <div v-if="mode === 'register'" class="form-grid">
        <a-form-item field="name" :label="t('accountAccess.name')">
          <a-input v-model="form.name" :max-length="128" :input-attrs="{ 'aria-label': t('accountAccess.name'), autocomplete: 'name' }" />
        </a-form-item>
        <a-form-item field="username" :label="t('accountAccess.username')">
          <a-input v-model="form.username" :max-length="64" :input-attrs="{ 'aria-label': t('accountAccess.username'), autocomplete: 'username', autocapitalize: 'none', spellcheck: false }" />
        </a-form-item>
      </div>
      <a-form-item field="email" :label="t('accountAccess.email')">
        <a-input ref="emailInput" v-model="form.email" :disabled="mode === 'reset'" :max-length="128" :input-attrs="{ 'aria-label': t('accountAccess.email'), autocomplete: 'email', inputmode: 'email', autocapitalize: 'none', spellcheck: false }">
          <template v-if="mode === 'forgot'" #prefix><IconEmail /></template>
        </a-input>
      </a-form-item>
      <template v-if="mode !== 'forgot'">
        <a-form-item field="code" :label="t('accountAccess.code')">
          <div class="email-code">
            <a-input v-model="form.code" :max-length="6" :input-attrs="{ 'aria-label': t('accountAccess.code'), autocomplete: 'one-time-code', inputmode: 'numeric' }" />
            <a-button v-if="mode === 'register'" :loading="sending" :disabled="cooldown > 0 || !validEmail || busy" @click="sendCode">{{ cooldown ? t('accountAccess.resend', { n: cooldown }) : t('accountAccess.send') }}</a-button>
          </div>
        </a-form-item>
        <a-alert v-if="emailSent" type="info" class="email-hint">{{ t('accountAccess.sent') }}</a-alert>
        <a-form-item field="password" required :label="t('accountAccess.password')" :extra="t('accountAccess.passwordRule')">
          <a-input-password v-model="form.password" :max-length="72" :input-attrs="{ 'aria-label': t('accountAccess.password'), autocomplete: 'new-password' }" />
        </a-form-item>
        <a-form-item field="passwordConfirmation" required :label="t('accountAccess.confirm')">
          <a-input-password v-model="form.passwordConfirmation" :max-length="72" :input-attrs="{ 'aria-label': t('accountAccess.confirm'), autocomplete: 'new-password' }" />
        </a-form-item>
      </template>
      <div class="access-actions">
        <a-button type="primary" html-type="submit" :loading="busy" :disabled="mode === 'register' && (!form.token || sending)">{{ t(`accountAccess.${mode}`) }}</a-button>
      </div>
    </a-form>
  </AccessShell>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onBeforeUnmount, reactive, ref, watch } from 'vue'
import type { FormInstance, InputInstance } from '@arco-design/web-vue'
import { IconArrowLeft, IconCheckCircleFill, IconEmail } from '@arco-design/web-vue/es/icon'
import { useFormLocale } from '@/composables/useFormLocale'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { accessSettings, sendRegistrationEmail, registerAccount, forgotPassword, resetPassword, type AccessSettings } from '@/api/account-access'
import AccessShell from './access-shell.vue'

defineOptions({ name: 'AccountAccess' })
const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const mode = computed(() => route.path === '/register' ? 'register' : route.path === '/reset-password' ? 'reset' : 'forgot')
const queryValue = (value: unknown) => typeof value === 'string' ? value : ''
const initialForm = () => ({ username: '', name: '', email: queryValue(route.query.email), password: '', passwordConfirmation: '', token: queryValue(route.query.token), code: '' })
const form = reactive(initialForm())
const policy = ref<AccessSettings>()
const policyFailed = ref(false)
const checking = ref(true)
const busy = ref(false)
const sending = ref(false)
const cooldown = ref(0)
const emailSent = ref(false)
const success = ref<'' | 'register' | 'forgot' | 'reset'>('')
const formRef = ref<FormInstance>()
const emailInput = ref<InputInstance>()
const successHeading = ref<HTMLElement>()
useFormLocale(formRef)
let generation = 0
let emailGeneration = 0
let timer: ReturnType<typeof setInterval> | undefined
const normalizedEmail = () => form.email.trim().toLowerCase()
const validEmail = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail()))
const blocked = computed(() => mode.value === 'register' && !policy.value?.enabled ? t('accountAccess.disabled') : !policy.value?.emailConfigured ? t('accountAccess.unavailable') : mode.value === 'reset' && (!form.token || !form.email) ? t('accountAccess.invalidLink') : '')
const rules = computed(() => ({
  username: [{ required: true, message: t('accountAccess.required') }],
  name: [{ required: true, message: t('accountAccess.required') }],
  email: [{ required: true, message: t('accountAccess.required') }, { type: 'email' as const, message: t('accountAccess.emailInvalid') }],
  code: [{ required: true, length: 6, message: t('accountAccess.required') }],
  password: [{ validator: (value: string, callback: (error?: string) => void) => { const length = new TextEncoder().encode(value).length; callback(length < 12 || length > 72 ? t('accountAccess.passwordRule') : undefined) } }],
  passwordConfirmation: [{ validator: (value: string, callback: (error?: string) => void) => callback(value !== form.password ? t('accountAccess.mismatch') : undefined) }]
}))

watch(normalizedEmail, () => {
  emailGeneration++
  if (mode.value !== 'register') return
  form.token = ''
  form.code = ''
  emailSent.value = false
  cooldown.value = 0
  clearInterval(timer)
}, { flush: 'sync' })
watch(() => route.fullPath, () => {
  generation++
  busy.value = false
  sending.value = false
  Object.assign(form, initialForm())
  success.value = ''
  emailSent.value = false
  cooldown.value = 0
  clearInterval(timer)
  formRef.value?.clearValidate()
})

async function focusFirstInvalid() {
  await nextTick()
  const root = formRef.value?.$el as HTMLElement | undefined
  root?.querySelector<HTMLInputElement>('.arco-form-item-status-error input')?.focus()
}
async function loadPolicy() {
  checking.value = true
  policyFailed.value = false
  try { policy.value = (await accessSettings()).data } catch { policyFailed.value = true } finally { checking.value = false }
}
async function sendCode() {
  if (sending.value || busy.value || cooldown.value || !validEmail.value || mode.value !== 'register' || blocked.value) return
  sending.value = true
  form.email = normalizedEmail()
  const email = form.email
  const current = generation
  const requestedEmail = emailGeneration
  try {
    const response = await sendRegistrationEmail(email)
    if (current !== generation || requestedEmail !== emailGeneration) return
    form.token = response.data.token
    form.code = ''
    emailSent.value = true
    cooldown.value = response.data.resendAfter
    const deadline = Date.now() + cooldown.value * 1000
    clearInterval(timer)
    timer = setInterval(() => {
      cooldown.value = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
      if (current !== generation || cooldown.value <= 0) clearInterval(timer)
    }, 1000)
  } catch { /* Shared request reports failures. */ } finally { if (current === generation) sending.value = false }
}
async function submit() {
  if (busy.value || checking.value || policyFailed.value || blocked.value || success.value || (mode.value === 'register' && (sending.value || !form.token))) return
  busy.value = true
  const current = generation
  const requestedMode = mode.value
  try {
    form.email = normalizedEmail()
    form.username = form.username.trim()
    form.name = form.name.trim()
    form.code = form.code.trim()
    if (!formRef.value || await formRef.value.validate()) {
      busy.value = false
      await focusFirstInvalid()
      return
    }
    if (current !== generation) return
    const payload = { ...form }
    if (requestedMode === 'register') await registerAccount(payload)
    else if (requestedMode === 'forgot') await forgotPassword(payload.email)
    else await resetPassword(payload)
    if (current !== generation) return
    success.value = requestedMode
    form.password = ''
    form.passwordConfirmation = ''
    form.code = ''
    form.token = ''
    clearInterval(timer)
    await nextTick()
    successHeading.value?.focus()
  } catch { /* Shared request reports failures. */ } finally { if (current === generation) busy.value = false }
}
async function editEmail() {
  success.value = ''
  await nextTick()
  emailInput.value?.focus()
}
onMounted(loadPolicy)
onBeforeUnmount(() => { generation++; clearInterval(timer) })
</script>

<style scoped lang="scss">
.back-to-login { display: grid; place-items: center; width: 36px; height: 36px; border-radius: var(--motor-radius-sm); color: var(--motor-text-2); font-size: 18px; text-decoration: none; }
.back-to-login:hover { color: var(--motor-primary); background: var(--motor-surface-soft); }
.back-to-login:focus-visible { outline: 2px solid var(--motor-primary); outline-offset: 4px; border-radius: 4px; }
.policy-loader { display: flex; justify-content: center; padding-block: 40px; }
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.email-code { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; width: 100%; }
.email-hint { margin-bottom: 20px; }
.access-success { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 12px; margin-block: 24px; }
.access-success__icon { color: rgb(var(--success-6)); font-size: var(--motor-font-size-24); }
.access-success h2, .access-success p { margin: 0; }
.access-success h2 { color: var(--motor-text-1); font-size: var(--motor-font-size-16); outline: none; }
.access-success p, .access-success small { display: block; margin-top: 5px; color: var(--motor-text-2); font-size: var(--motor-font-size-14); line-height: 1.55; }
.access-success ol { grid-column: 2; margin: 4px 0 0; padding-left: 20px; color: var(--motor-text-2); line-height: 1.8; }
@media (width <= 520px) { .form-grid { grid-template-columns: 1fr; gap: 0; } }
@media (width <= 360px) { .email-code { grid-template-columns: 1fr; } .email-code .arco-btn { width: 100%; } }
@media (width <= 767px), (pointer: coarse) { .back-to-login { width: 44px; height: 44px; } }
</style>
