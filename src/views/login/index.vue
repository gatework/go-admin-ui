<template>
  <AccessShell :title="t('login.form.title')" :description="t('login.subtitle')">
    <template v-if="registrationEnabled && !mfaActive" #actions>
      <a-tooltip :content="t('accountAccess.register')">
        <RouterLink class="login-register" to="/register" :aria-label="t('accountAccess.register')"><IconUserAdd aria-hidden="true" /></RouterLink>
      </a-tooltip>
    </template>
    <a-alert v-if="policyFailed" type="warning" class="policy-error">
      {{ t('accountAccess.policyUnavailable') }}
      <template #action><a-button type="text" size="small" :loading="policyLoading" @click="loadPolicy">{{ t('accountAccess.retry') }}</a-button></template>
    </a-alert>
    <LoginForm @phase-change="mfaActive = $event" />
  </AccessShell>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { IconUserAdd } from '@arco-design/web-vue/es/icon'
import { accessSettings } from '@/api/account-access'
import AccessShell from '@/views/account-access/access-shell.vue'
import LoginForm from './components/login-form.vue'

defineOptions({ name: 'LoginView' })
const { t } = useI18n()
const registrationEnabled = ref(false)
const mfaActive = ref(false)
const policyFailed = ref(false)
const policyLoading = ref(false)
async function loadPolicy() {
  if (policyLoading.value) return
  policyLoading.value = true
  policyFailed.value = false
  try { registrationEnabled.value = (await accessSettings()).data?.enabled === true } catch { policyFailed.value = true } finally { policyLoading.value = false }
}
onMounted(loadPolicy)
</script>

<style scoped lang="scss">
.login-register { display: grid; place-items: center; width: 36px; height: 36px; border-radius: var(--motor-radius-sm); color: var(--motor-text-2); font-size: 18px; text-decoration: none; }
.login-register:hover { color: var(--motor-primary); background: var(--motor-surface-soft); }
.login-register:focus-visible { outline: 2px solid var(--motor-primary); outline-offset: 3px; }
.policy-error { margin-bottom: 20px; }
@media (width <= 767px), (pointer: coarse) { .login-register { width: 44px; height: 44px; } }
</style>
