<template>
  <section class="registration-policy">
    <h3>{{ t('accountAccess.policy') }}</h3><p>{{ t('accountAccess.policyDesc') }}</p>
    <a-spin v-if="loading" />
    <a-alert v-else-if="failed" type="error">{{ t('accountAccess.policyUnavailable') }}<a-button type="text" @click="load">{{ t('accountAccess.retry') }}</a-button></a-alert>
    <template v-else>
      <a-alert v-if="!emailConfigured" type="warning">{{ t('accountAccess.unavailable') }}</a-alert>
      <div class="policy-controls"><a-switch v-model="enabled" :aria-label="t('accountAccess.policy')" :disabled="saving" /><a-button type="primary" :loading="saving" @click="save">{{ t('accountAccess.save') }}</a-button></div>
    </template>
  </section>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Message } from '@arco-design/web-vue'
import { registrationPolicy, saveRegistrationPolicy } from '@/api/account-access'
const { t } = useI18n(); const enabled = ref(false); const loading = ref(true); const saving = ref(false); const failed = ref(false); const emailConfigured = ref(false)
async function load() { loading.value = true; failed.value = false; try { const { data } = await registrationPolicy(); enabled.value = data.enabled; emailConfigured.value = data.emailConfigured } catch { failed.value = true } finally { loading.value = false } }
async function save() { if (saving.value) return; saving.value = true; try { await saveRegistrationPolicy(enabled.value); Message.success(t('accountAccess.saved')) } catch { /* Shared request reports failures. */ } finally { saving.value = false } }
onMounted(load)
</script>
<style scoped>
.registration-policy { margin-top: 28px; padding-top: 24px; border-top: 1px solid var(--motor-border); }
h3 { margin: 0 0 8px; } p { color: var(--motor-text-2); line-height: 1.7; }
.policy-controls { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-top: 16px; }
</style>
