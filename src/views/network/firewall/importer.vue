<template><a-form
  :ref="form.bindFormRef"
  :model="form.model"
  layout="vertical"
  @submit-success="form.submit"
>
  <p class="fw-muted">{{ t('networkFirewall.fileHelp') }}</p><a-alert
    v-if="error"
    type="warning"
  >{{ error }}</a-alert><a-alert
    v-if="conflict"
    type="warning"
  >{{ t('networkFirewall.stale') }}</a-alert><label>{{ t('networkFirewall.file') }}<input
    class="fw-file"
    type="file"
    :disabled="form.submitting"
    @change="selectFile"
  ></label><a-descriptions :column="1"><a-descriptions-item
    :label="t('networkFirewall.expectedRevision')"
  >{{ form.model.expectedRevision || '—' }}</a-descriptions-item><a-descriptions-item
    :label="t('networkFirewall.filename')"
  >{{ form.model.filename || '—' }}</a-descriptions-item></a-descriptions><a-checkbox
    v-model="form.model.complete"
  >{{ t('networkFirewall.complete') }}</a-checkbox>
  <p class="fw-muted">{{ t('networkFirewall.incompleteHint') }}</p><a-button
    type="primary"
    html-type="submit"
    :disabled="!form.model.text || conflict || reading"
    :loading="form.submitting"
  >{{ t('networkFirewall.import') }}</a-button>
</a-form></template>
<script setup lang="ts">
defineOptions({ name: 'FirewallImporter' })
import { computed, onBeforeUnmount, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useForm } from '@/composables/useForm'
import { addImport } from '@/api/network/firewall'
import type { ImportJob, Instance } from '@/types/firewall'
import { requestKey } from './presentation'
import { useWorkspace } from './workspace'
const props = defineProps<{ instance: Instance, maxBytes: number }>(); const emit = defineEmits<{ saved: [job: ImportJob] }>(); const { t } = useI18n(); const workspace = useWorkspace(); const error = ref(''); const reading = ref(false); let generation = 0
const form = useForm({ defaultModel: () => ({ requestKey: requestKey(), expectedRevision: props.instance.currentRevision, text: '', filename: '', complete: true }), submit: async model => { if (!workspace.allowed('import') || !workspace.current() || conflict.value) throw new Error('stale'); const result = await addImport(props.instance.id, { ...model }); if (workspace.current()) emit('saved', result.data) }, onError: () => { error.value = t('networkFirewall.loadFailed') }, successMessage: null })
const conflict = computed(() => props.instance.currentRevision !== form.model.expectedRevision)
async function selectFile(event: Event) { const own = ++generation; const file = (event.target as HTMLInputElement).files?.[0]; form.model.text = ''; error.value = ''; if (!file) return; if (file.size > props.maxBytes) { error.value = t('networkFirewall.fileTooLarge'); return }; reading.value = true; try { const text = await file.text(); if (own !== generation || !workspace.current()) return; form.model.text = text; form.model.filename = file.name; form.model.expectedRevision = props.instance.currentRevision; form.model.requestKey = requestKey() } catch { error.value = t('networkFirewall.fileFailed') } finally { if (own === generation) reading.value = false } }
onBeforeUnmount(() => { generation++ })
</script>
