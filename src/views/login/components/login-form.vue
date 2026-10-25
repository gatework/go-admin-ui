<template>
  <div class="form-box">
    <h2 class="panel-title">{{ resolveAppName(system.info.sys_app_name) }}</h2>
    <p class="panel-sub">{{ $t('login.subtitle') }}</p>
    <a-form
      ref="formRef"
      :model="model"
      :rules="rules"
      layout="vertical"
      class="login-form"
      autocomplete="on"
      @submit-success="handleLogin"
    >
      <a-form-item :label="$t('login.username')" field="username">
        <a-input
          ref="username"
          v-model="model.username"
          :placeholder="$t('login.usernamePlaceholder')"
          name="username"
          type="text"

          autocomplete="username"
          size="large"
        />
      </a-form-item>

      <a-form-item :label="$t('login.password')" field="password">
        <a-input-password
          ref="password"
          v-model="model.password"
          :placeholder="$t('login.passwordPlaceholder')"
          name="password"

          autocomplete="current-password"
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

            :input-attrs="{ inputmode: 'numeric' }"
            :max-length="6"
            autocomplete="off"
            size="large"
          />
          <button type="button" class="captcha-wrap" :title="$t('login.captchaRefresh')" :aria-label="$t('login.captchaRefresh')" :disabled="captchaLoading" @click="getCode">
            <a-spin v-if="captchaLoading" />
            <img v-else-if="codeUrl" :src="codeUrl" class="captcha-img" :alt="$t('login.captcha')">
            <icon-refresh v-else />
          </button>
        </div>
      </a-form-item>

      <a-button
        :loading="loading"
        size="large"
        class="submit-btn"
        type="primary"
        html-type="submit"
      >
        {{ loading ? $t('login.submitting') : $t('login.submit') }}
      </a-button>
    </a-form>
    <p class="panel-tip">{{ $t('login.forgotPassword') }}</p>
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import type { FormInstance } from '@arco-design/web-vue'
import { useFormLocale } from '@/composables/useFormLocale'
import { getCodeImg } from '@/api/login'
import { resolveAppName } from '@/config/app-meta'
import { useSystemStore } from '@/stores/system'
import { useUserStore } from '@/stores/user'
import { prefetchOnIdle } from '@/utils/prefetch'
const { t } = useI18n(); const route = useRoute(); const router = useRouter()
const system = useSystemStore(); const user = useUserStore()
const formRef = ref<FormInstance>()
useFormLocale(formRef)
const model = reactive({ username: 'admin', password: '123456', code: '', uuid: '' })
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
    await user.login(model)
    const target = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
    const redirect = target.startsWith('/') && !target.startsWith('//') && !target.includes('\\') && !target.startsWith('/login') ? target : '/'
    const query = Object.fromEntries(Object.entries(route.query).filter(([key]) => key !== 'redirect'))
    await router.push({ path: redirect, query })
  } catch { await getCode() } finally { loading.value = false }
}
onMounted(() => { void getCode(); void system.settingDetail().catch(() => {}); prefetchOnIdle(() => import('@/views/dashboard/index.vue')) })
</script>
<style scoped lang="scss">
.form-box { width: 100%; max-width: 420px; }
.panel-title { margin: 0 0 10px; color: var(--motor-text-1); font-size: var(--motor-font-size-32); font-weight: 650; overflow-wrap: anywhere; }
.panel-sub { color: var(--motor-text-2); margin: 0 0 32px; }
.panel-tip { color: var(--motor-text-2); font-size: 12px; margin-top: 24px; }
.captcha-row { display: flex; gap: 10px; width: 100%; min-width: 0; }
.captcha-row > .arco-input-wrapper { flex: 1; min-width: 0; }
.captcha-wrap { position: relative; flex-shrink: 0; width: 150px; display: grid; place-items: center; padding: 0; border: 1px solid var(--motor-border); border-radius: var(--motor-radius-sm); background: var(--motor-surface); color: var(--motor-text-3); overflow: hidden; cursor: pointer; }
.captcha-wrap:hover:not(:disabled) { border-color: var(--motor-primary); }
.captcha-wrap:disabled { cursor: wait; opacity: 0.7; }
.captcha-img { position: absolute; width: 100%; height: 100%; object-fit: contain; }
@media (max-width: 520px) { .captcha-wrap { width: 124px; } }
.submit-btn { width: 100%; margin-top: 4px; }
</style>
