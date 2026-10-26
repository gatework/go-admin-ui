<template>
  <div class="mfa-challenge">
    <h2>{{ t('accountAccess.mfa') }}</h2><p>{{ t('accountAccess.mfaLoginDesc') }}</p>
    <a-alert v-if="expired" type="warning">{{ t('accountAccess.expired') }}</a-alert>
    <a-form v-else ref="formRef" :model="form" layout="vertical" @submit-success="verify">
      <a-form-item field="code" :label="t(recovery ? 'accountAccess.recovery' : 'accountAccess.otp')" :rules="[{ required: true, message: t('accountAccess.required') }]"><a-input ref="codeInput" v-model="form.code" :max-length="recovery ? 32 : 6" :input-attrs="{ 'aria-label': t(recovery ? 'accountAccess.recovery' : 'accountAccess.otp'), 'autocomplete': recovery ? 'off' : 'one-time-code', 'inputmode': recovery ? 'text' : 'numeric' }" /></a-form-item>
      <a-button type="primary" long html-type="submit" :loading="busy">{{ t('accountAccess.verify') }}</a-button>
      <a-button type="text" class="mfa-switch" @click="recovery = !recovery; form.code = ''">{{ t(recovery ? 'accountAccess.useOTP' : 'accountAccess.useRecovery') }}</a-button>
    </a-form>
    <a-button type="text" :disabled="busy" @click="$emit('cancel')">{{ t('accountAccess.back') }}</a-button>
  </div>
</template>
<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import type { FormInstance } from '@arco-design/web-vue'
import { useFormLocale } from '@/composables/useFormLocale'
import { useI18n } from 'vue-i18n'
import { useUserStore } from '@/stores/user'
const props = defineProps<{ token: string; expiresIn: number }>()
const emit = defineEmits<{ complete: []; cancel: [] }>()
const formRef = ref<FormInstance>()
useFormLocale(formRef)
const { t } = useI18n(); const user = useUserStore(); const form = reactive({ code: '' }); const recovery = ref(false); const busy = ref(false); const expired = ref(false); const codeInput = ref<{ focus: () => void }>()
let timer: ReturnType<typeof setTimeout>
onMounted(() => { codeInput.value?.focus(); timer = setTimeout(() => { expired.value = true }, props.expiresIn * 1000) })
onBeforeUnmount(() => clearTimeout(timer))
async function verify() { if (busy.value) return; busy.value = true; try { const result = await user.login({ challengeToken: props.token, ...(recovery.value ? { recoveryCode: form.code } : { totpCode: form.code }) }); if (result.token) { form.code = ''; emit('complete') } } catch { form.code = '' } finally { busy.value = false } }
</script>
<style scoped>
.mfa-challenge p { line-height: 1.7; color: var(--motor-text-2); margin-bottom: 24px; }
.mfa-switch { display: block; margin-top: 16px; }
</style>
