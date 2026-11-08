<template>
  <AppModal class="delivery-connection" :visible="visible" :title="t('networkDelivery.connectionOptions')" :width="narrow ? 'calc(100% - 24px)' : 480" :mask-closable="false" :closable="!form.submitting" @update:visible="close">
    <a-spin :loading="form.loading" style="width: 100%">
      <a-result v-if="loadFailed" status="error" :title="t('networkDelivery.deviceLoadFailed')"><template #extra><a-button @click="load">{{ t('networkDelivery.retry') }}</a-button></template></a-result>
      <template v-else-if="form.visible">
        <p class="delivery-help">{{ device ? `${deviceName(device)} · ${device.ip}` : '' }}</p>
        <p class="delivery-help">{{ t('networkDelivery.connectionHelp') }}</p>
        <a-alert v-if="conflict" type="warning" class="delivery-notice">{{ t('networkDelivery.connectionConflict') }}<template #action><a-button @click="load">{{ t('common.refresh') }}</a-button></template></a-alert>
        <a-form :ref="form.bindFormRef" :model="form.model" :rules="form.rules" layout="vertical" :disabled="form.submitting" @submit-success="form.submit">
          <a-form-item v-input-label="t('networkDelivery.profile')" field="profile" :label="t('networkDelivery.profile')"><a-select v-model="form.model.profile" allow-search><a-option value="">{{ t('networkDelivery.automaticPlatform', { platform: platformName(form.model.inferredProfile, t) }) }}</a-option><a-option v-for="profile in profiles" :key="profile" :value="profile">{{ platformName(profile, t) }}</a-option></a-select></a-form-item>
          <div class="delivery-connection-grid">
            <a-form-item v-input-label="t('networkDelivery.protocol')" field="protocol" :label="t('networkDelivery.protocol')"><a-select v-model="form.model.protocol" @change="changeProtocol"><a-option value="ssh">SSH</a-option><a-option value="telnet">Telnet</a-option></a-select></a-form-item>
            <a-form-item v-input-label="t('networkDelivery.port')" field="port" :label="t('networkDelivery.port')"><a-input-number v-model="form.model.port" :min="1" :max="65535" :precision="0" /></a-form-item>
          </div>
        </a-form>
        <a-button type="text" :disabled="form.submitting" @click="restoreDefaults">{{ t('networkDelivery.restoreDefaults') }}</a-button>
      </template>
    </a-spin>
    <template #footer><a-button :disabled="form.submitting" @click="close">{{ t('common.cancel') }}</a-button><a-button type="primary" :loading="form.submitting" :disabled="form.loading || !form.visible || conflict" @click="form.submit">{{ t('common.dialogConfirm') }}</a-button></template>
  </AppModal>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AppModal from '@/components/AppModal/index.vue'
import { useForm } from '@/composables'
import { useNarrowScreen } from '@/composables/useNarrowScreen'
import { useUserStore } from '@/stores/user'
import { getConnection, updateConnection } from '@/api/network/delivery'
import type { ConnectionSettings, DeviceSnapshot } from '@/types/network-delivery'
import { deviceName } from './form'
import { platformName } from './inventory'
import { vInputLabel } from '../shared/input-label'

defineOptions({ name: 'DeliveryConnection' })
const props = defineProps<{ visible: boolean, device?: DeviceSnapshot, profiles: string[] }>()
const emit = defineEmits<{ 'update:visible': [boolean], saved: [] }>()
const { t } = useI18n()
const narrow = useNarrowScreen()
const user = useUserStore()
const loadFailed = ref(false)
const conflict = ref(false)
let controller: AbortController | undefined
let session = ''
const form = useForm<ConnectionSettings, number>({
  defaultModel: () => ({ profile: '', protocol: 'ssh', port: 22, version: 0, ready: false }),
  rules: computed(() => ({ port: [{ required: true, type: 'number', min: 1, max: 65535, message: t('networkDelivery.connectionRequired') }] })),
  api: { get: async id => { const result = await getConnection(id, controller?.signal); return { ...result, data: { ...result.data, profile: result.data.profileSource === 'manual' ? result.data.profile : '' }} } },
  submit: draft => {
    if (!props.visible || !props.device || session !== user.token || !user.permisaction.some(p => p === '*:*:*' || p === 'network:delivery:connection')) throw new Error('Inactive connection form')
    return updateConnection(props.device.id, { version: draft.version, profile: draft.profile, protocol: draft.protocol, port: draft.port })
  },
  successMessage: () => t('networkDelivery.connectionSaved'),
  onError: error => { if (form.loading) loadFailed.value = true; else conflict.value = error.code === 409 },
  onSuccess: () => { if (session === user.token) { emit('saved'); emit('update:visible', false) } }
})
function changeProtocol() { if (form.model.port === 22 || form.model.port === 23) form.model.port = form.model.protocol === 'ssh' ? 22 : 23 }
function restoreDefaults() { form.model.profile = ''; form.model.protocol = 'ssh'; form.model.port = 22 }
function close() { if (form.submitting) return; controller?.abort(); form.close(); emit('update:visible', false) }
function load() {
  if (!props.visible || !props.device || form.submitting) return
  controller?.abort(); controller = new AbortController(); session = user.token; loadFailed.value = false; conflict.value = false
  void form.openEdit(props.device.id)
}
watch(() => [props.visible, props.device?.id], () => { if (props.visible) load(); else { controller?.abort(); form.close() } }, { immediate: true })
watch(() => user.token, close)
onBeforeUnmount(() => { controller?.abort(); form.close() })
</script>
