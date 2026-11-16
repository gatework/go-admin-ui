<template>
  <AppModal :visible="visible" :title="t('networkFirewall.online.connection')" :width="narrow ? 'calc(100% - 24px)' : 480" :mask-closable="false" :closable="!form.submitting" @update:visible="close">
    <a-spin :loading="form.loading" class="fw-full-width">
      <a-alert v-if="failed" type="warning">{{ t('networkFirewall.loadFailed') }}<template #action><a-button @click="load">{{ t('networkFirewall.retry') }}</a-button></template></a-alert>
      <template v-else-if="form.visible">
        <p>{{ device?.name }} · {{ device?.ip }}</p>
        <p class="fw-muted">{{ t('networkFirewall.online.credentialsHelp') }}</p>
        <a-alert v-if="conflict" type="warning">{{ t('networkFirewall.online.connectionConflict') }}<template #action><a-button @click="load">{{ t('networkFirewall.refresh') }}</a-button></template></a-alert>
        <a-form :ref="form.bindFormRef" :model="form.model" :rules="form.rules" layout="vertical" :disabled="form.submitting || !workspace.allowed('connection')" @submit-success="form.submit">
          <a-form-item v-input-label="t('networkFirewall.online.driver')" :label="t('networkFirewall.online.driver')">
            <a-select v-model="form.model.profile"><a-option value="">{{ t('networkFirewall.online.automaticDriver', { driver: form.model.inferredProfile || '—' }) }}</a-option><a-option v-if="form.model.inferredProfile" :value="form.model.inferredProfile">{{ form.model.inferredProfile }}</a-option></a-select>
          </a-form-item>
          <a-form-item v-input-label="t('networkFirewall.online.transport')" :label="t('networkFirewall.online.transport')"><a-select v-model="form.model.protocol" @change="changeProtocol"><a-option value="ssh">SSH</a-option><a-option value="telnet">Telnet</a-option></a-select></a-form-item>
          <a-form-item v-input-label="t('networkFirewall.port')" field="port" :label="t('networkFirewall.port')"><a-input-number v-model="form.model.port" :min="1" :max="65535" :precision="0" /></a-form-item>
          <a-tag :color="form.model.credentialsConfigured ? 'green' : 'orange'">{{ t(form.model.credentialsConfigured ? 'networkFirewall.online.credentialsReady' : 'networkFirewall.online.credentialsMissing') }}</a-tag>
        </a-form>
      </template>
    </a-spin>
    <template #footer><a-button :disabled="form.submitting" @click="close">{{ t('common.cancel') }}</a-button><a-button v-if="workspace.allowed('connection')" type="primary" :loading="form.submitting" :disabled="form.loading || failed || !form.visible" @click="form.submit">{{ t('networkFirewall.save') }}</a-button></template>
  </AppModal>
</template>
<script setup lang="ts">
defineOptions({ name: 'FirewallConnection' })
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AppModal from '@/components/AppModal/index.vue'
import { useForm } from '@/composables/useForm'
import { useNarrowScreen } from '@/composables/useNarrowScreen'
import { getFirewallConnection, saveFirewallConnection } from '@/api/network/firewall'
import type { FirewallConnection, FirewallDevice } from '@/types/firewall'
import { vInputLabel } from '../shared/input-label'
import { useWorkspace } from './workspace'
const props = defineProps<{ visible: boolean, device?: FirewallDevice }>()
const emit = defineEmits<{ 'update:visible': [boolean], saved: [] }>()
const { t } = useI18n(); const narrow = useNarrowScreen(); const workspace = useWorkspace()
const failed = ref(false); const conflict = ref(false)
let controller: AbortController | undefined
const form = useForm<FirewallConnection, number>({
  defaultModel: () => ({ profile: '', protocol: 'ssh', port: 22, version: 0, ready: false, reason: '', profileSource: 'automatic', inferredProfile: '', vendor: '', credentialsConfigured: false, contextRequired: false }),
  rules: computed(() => ({ port: [{ required: true, type: 'number', min: 1, max: 65535, message: t('networkFirewall.online.validPort') }] })),
  api: { get: async id => { const res = await workspace.guard(() => getFirewallConnection(id, controller?.signal)); return { ...res, data: { ...res.data, profile: res.data.profileSource === 'manual' ? res.data.profile : '' }} } },
  submit: draft => { if (!workspace.current() || !workspace.allowed('connection') || !props.visible || !props.device) throw new Error('Inactive connection form'); return saveFirewallConnection(props.device.id, { version: draft.version, profile: draft.profile, protocol: draft.protocol, port: draft.port }, controller?.signal) },
  successMessage: null,
  onError: error => { if (form.loading) failed.value = true; else conflict.value = error.code === 409 },
  onSuccess: () => { if (workspace.current()) { emit('saved'); emit('update:visible', false) } }
})
function changeProtocol() { if ([22, 23].includes(form.model.port)) form.model.port = form.model.protocol === 'ssh' ? 22 : 23 }
function close() { if (form.submitting) return; controller?.abort(); form.close(); emit('update:visible', false) }
function load() { if (!props.visible || !props.device || form.submitting) return; controller?.abort(); controller = new AbortController(); failed.value = false; conflict.value = false; void form.openEdit(props.device.id) }
watch(() => [props.visible, props.device?.id], () => { if (props.visible) load(); else { controller?.abort(); form.close() } }, { immediate: true })
onBeforeUnmount(() => { controller?.abort(); form.close() })
</script>
