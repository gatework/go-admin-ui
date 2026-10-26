<template>
  <div class="form-box">
    <MFAChallenge v-if="challenge" :token="challenge.token" :expires-in="challenge.expiresIn" @complete="finishLogin" @cancel="challenge = undefined; getCode()" />
    <template v-else>
      <a-form
        ref="formRef"
        :model="model"
        :rules="rules"
        :disabled="loading"
        :aria-busy="loading"
        layout="vertical"
        class="login-form"
        autocomplete="on"
        @submit="handleLogin"
      >
        <a-form-item :label="$t('login.username')" field="username">
          <a-input
            ref="username"
            v-model="model.username"
            :placeholder="$t('login.usernamePlaceholder')"
            name="username"
            :input-attrs="{ 'aria-label': t('login.username'), autocomplete: 'username', autocapitalize: 'none', spellcheck: false }"
            size="large"
          ><template #prefix><icon-user /></template></a-input>
        </a-form-item>

        <a-form-item :label="$t('login.password')" field="password">
          <a-input-password
            ref="password"
            v-model="model.password"
            :placeholder="$t('login.passwordPlaceholder')"
            name="password"

            :input-attrs="{ 'aria-label': t('login.password'), autocomplete: 'current-password' }"
            size="large"
          >
            <template #prefix><icon-lock /></template>
          </a-input-password>
        </a-form-item>

        <a-form-item :label="$t('login.captcha')" field="code">
          <div class="captcha-row">
            <a-input
              v-model="model.code"
              :placeholder="$t('login.captchaPlaceholder')"
              name="code"
              type="text"

              :input-attrs="{ 'aria-label': t('login.captcha'), inputmode: 'numeric', autocomplete: 'off' }"
              :max-length="6"
              size="large"
            ><template #prefix><icon-safe /></template></a-input>
            <button type="button" class="captcha-wrap" :title="$t('login.captchaRefresh')" :aria-label="$t('login.captchaRefresh')" :disabled="captchaLoading || loading" @click="getCode">
              <a-spin v-if="captchaLoading" />
              <img v-else-if="codeUrl" :src="codeUrl" class="captcha-img" :alt="$t('login.captcha')">
              <icon-refresh v-else />
            </button>
          </div>
        </a-form-item>

        <div class="login-form__options"><RouterLink to="/forgot-password">{{ $t('login.forgotPassword') }}</RouterLink></div>
        <a-button
          :loading="loading"
          :disabled="captchaLoading || !model.uuid"
          size="large"
          class="submit-btn"
          type="primary"
          html-type="submit"
        >
          {{ loading ? $t('login.submitting') : $t('login.submit') }}
        </a-button>
      </a-form>
    </template>
  </div>
</template>
<script setup lang="ts">
import MFAChallenge from './mfa-challenge.vue'
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import type { FormInstance } from '@arco-design/web-vue'
import { useFormLocale } from '@/composables/useFormLocale'
import { getCodeImg } from '@/api/login'
import { useSystemStore } from '@/stores/system'
import { useUserStore } from '@/stores/user'
import { prefetchOnIdle } from '@/utils/prefetch'
const { t } = useI18n(); const route = useRoute(); const router = useRouter()
const system = useSystemStore(); const user = useUserStore()
const emit = defineEmits<{ phaseChange: [mfaActive: boolean] }>()
const formRef = ref<FormInstance>()
useFormLocale(formRef)
const model = reactive({ username: '', password: '', code: '', uuid: '' })
const challenge = ref<{ token: string; expiresIn: number }>()
watch(challenge, value => emit('phaseChange', Boolean(value)))
const loading = ref(false); const captchaLoading = ref(false); const codeUrl = ref('')
const rules = computed(() => ({ username: [{ required: true, message: t('login.rules.username') }], password: [{ required: true, message: t('login.rules.password') }], code: [{ required: true, message: t('login.rules.captcha') }, { match: /^\d{6}$/, message: t('login.rules.captchaFormat') }] }))
const getCode = async() => {
  if (captchaLoading.value) return
  captchaLoading.value = true
  codeUrl.value = ''
  model.code = ''
  model.uuid = ''
  try { const response = await getCodeImg(); codeUrl.value = response.data; model.uuid = response.id } catch { /* Request errors are already reported. */ } finally { captchaLoading.value = false }
}
const handleLogin = async() => {
  if (loading.value || captchaLoading.value || !model.uuid) return
  loading.value = true
  try {
    if (!formRef.value || await formRef.value.validate()) {
      loading.value = false
      await nextTick()
      const root = formRef.value?.$el as HTMLElement | undefined
      root?.querySelector<HTMLInputElement>('.arco-form-item-status-error input')?.focus()
      return
    }
    const response = await user.login({ ...model })
    if (response.mfaRequired && response.challengeToken) { challenge.value = { token: response.challengeToken, expiresIn: response.expiresIn || 300 }; model.password = ''; return }
    await finishLogin()
  } catch { await getCode() } finally { loading.value = false }
}
async function finishLogin() {
  const target = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
  const redirect = target.startsWith('/') && !target.startsWith('//') && !target.includes('\\') && !target.startsWith('/login') ? target : '/'
  const query = Object.fromEntries(Object.entries(route.query).filter(([key]) => key !== 'redirect'))
  await router.push({ path: redirect, query })
}
onMounted(() => { void getCode(); void system.settingDetail().catch(() => {}); prefetchOnIdle(() => import('@/views/dashboard/index.vue')) })
</script>
<style scoped lang="scss">
.form-box { width: 100%; }
.login-form__options { display: flex; justify-content: flex-end; margin: -4px 0 20px; }
.login-form__options a { color: var(--motor-primary); text-underline-offset: 3px; }
.captcha-row { display: flex; gap: 10px; width: 100%; min-width: 0; }
.captcha-row > .arco-input-wrapper { flex: 1; min-width: 0; }
.captcha-wrap { position: relative; flex-shrink: 0; width: 150px; display: grid; place-items: center; padding: 0; border: 1px solid var(--motor-border); border-radius: var(--motor-radius-sm); background: var(--motor-surface); color: var(--motor-text-3); overflow: hidden; cursor: pointer; }
.captcha-wrap:hover:not(:disabled) { border-color: var(--motor-primary); }
.captcha-wrap:focus-visible { outline: 2px solid var(--motor-primary); outline-offset: 3px; }
.captcha-wrap:disabled { cursor: wait; opacity: 0.7; }
.captcha-img { position: absolute; width: 100%; height: 100%; object-fit: contain; }
@media (max-width: 520px) { .captcha-wrap { width: 124px; } }
.submit-btn { width: 100%; margin-top: 4px; }
</style>
