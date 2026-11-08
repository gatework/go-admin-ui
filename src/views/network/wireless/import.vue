<template>
  <a-space direction="vertical" fill :size="16">
    <a-alert>{{ t('networkWireless.importHint') }}</a-alert>
    <label>{{ t('networkWireless.file') }}<input type="file" accept=".csv,text/csv" :disabled="pending" @change="load"></label>
    <a-alert v-if="error" type="warning">{{ error }}</a-alert>
    <a-button :loading="pending" :disabled="!content || !active" @click="preview">{{ t('networkWireless.preview') }}</a-button>
    <template v-if="result"><a-alert :type="result.errors.length ? 'warning' : 'success'">{{ t(result.errors.length ? 'networkWireless.importInvalid' : 'networkWireless.importReady', { count: result.errors.length || result.rows }) }}</a-alert><p v-for="row in result.errors" :key="row.row">{{ t('networkWireless.importErrors', { row: row.row }) }}</p><a-button type="primary" :loading="pending" :disabled="!result.rows || !!result.errors.length || !active" @click="commit">{{ t('networkWireless.commit') }}</a-button></template>
  </a-space>
</template>
<script setup lang="ts">
defineOptions({ name: 'WirelessImport' })
import { onBeforeUnmount, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { previewImport, commitImport } from '@/api/network/wireless'
import type { ImportPreview } from '@/types/network-wireless'
import { useSession } from './session'
import { isConflict } from './presentation'
const emit = defineEmits<{ saved: [] }>()
const { t } = useI18n()
const { active, pending, run } = useSession()
const content = ref(''); const result = ref<ImportPreview>(); const error = ref('')
let generation = 0
async function load(event: Event) { const version = ++generation; result.value = undefined; content.value = ''; error.value = ''; const file = (event.target as HTMLInputElement).files?.[0]; if (!file) return; if (!file.size || file.size > 10 * 1024 * 1024) { error.value = t('networkWireless.invalidFile'); return } try { const text = await file.text(); if (active.value && version === generation) content.value = text } catch { if (version === generation) error.value = t('networkWireless.invalidFile') } }
async function preview() { result.value = undefined; error.value = ''; try { const response = await run(signal => previewImport(content.value, signal)); if (response) result.value = response.data } catch { /* no stale preview retained */ } }
async function commit() { if (!result.value || result.value.errors.length || !result.value.rows) return; try { const response = await run(signal => commitImport(content.value, result.value!.digest, signal)); if (response) emit('saved') } catch(e) { result.value = undefined; if (isConflict(e)) error.value = t('networkWireless.importConflict') } }
onBeforeUnmount(() => { generation++ })
</script>
