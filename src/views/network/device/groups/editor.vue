<template>
  <AppDrawer class="network-drawer" :visible="visible" :title="t(record ? 'network.device.groups.edit' : 'network.device.groups.add')" :width="narrow ? '100%' : 520" :mask-closable="false" :closable="!saving" @update:visible="close">
    <a-alert v-if="conflict" type="warning" class="group-editor__notice" :title="t('network.device.groups.conflict')">
      {{ t('network.device.groups.conflictHelp') }}
      <template #action><a-button :loading="reloading" @click="reload">{{ t('network.device.reload') }}</a-button></template>
    </a-alert>
    <a-alert v-else-if="failed" type="error" class="group-editor__notice">{{ t('network.device.saveFailed') }}</a-alert>
    <a-form :ref="form.bindFormRef" :model="form.model" :rules="form.rules" :disabled="saving || reloading" layout="vertical" @submit-success="save">
      <a-form-item field="name" :label="t('network.device.groups.name')"><a-input v-model="form.model.name" :input-attrs="{ 'aria-label': t('network.device.groups.name') }" :max-length="128" /></a-form-item>
      <a-form-item field="code" :label="t('network.device.groups.code')" :help="t('network.device.groups.codeHelp')"><a-input v-model="form.model.code" :input-attrs="{ 'aria-label': t('network.device.groups.code') }" :disabled="Boolean(record)" :max-length="100" /></a-form-item>
      <a-form-item v-input-label="t('network.device.groups.parent')" field="parentId" :label="t('network.device.groups.parent')">
        <a-select :model-value="form.model.parentId ?? 0" :options="parentOptions" allow-search @update:model-value="form.model.parentId = typeof $event === 'number' && $event > 0 ? $event : null" />
      </a-form-item>
      <a-form-item field="description" :label="t('network.device.groups.description')"><a-textarea v-model="form.model.description" :textarea-attrs="{ 'aria-label': t('network.device.groups.description') }" :max-length="4000" :auto-size="{ minRows: 3, maxRows: 6 }" show-word-limit /></a-form-item>
      <a-form-item v-input-label="t('network.device.groups.position')" field="position" :label="t('network.device.groups.position')"><a-input-number v-model="form.model.position" :min="0" :precision="0" /></a-form-item>
      <a-form-item field="enabled" :label="t('network.device.groups.enabled')" :help="t('network.device.groups.enabledHelp')"><a-switch v-model="form.model.enabled" :aria-label="t('network.device.groups.enabled')" /></a-form-item>
    </a-form>
    <template #footer>
      <a-button :disabled="saving" @click="close">{{ t('common.cancel') }}</a-button>
      <a-button type="primary" :loading="saving" :disabled="conflict || reloading" @click="save">{{ t('common.dialogConfirm') }}</a-button>
    </template>
  </AppDrawer>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onDeactivated, ref, watch } from 'vue'
import { isAxiosError } from 'axios'
import { useI18n } from 'vue-i18n'
import AppDrawer from '@/components/AppDrawer/index.vue'
import { useForm } from '@/composables'
import { useNarrowScreen } from '@/composables/useNarrowScreen'
import { addDeviceGroup, updateDeviceGroup } from '@/api/network/device'
import { useUserStore } from '@/stores/user'
import type { DeviceGroupDraft, DeviceGroupNode } from '@/types/network'
import type { FormRules } from '@/types/ui'
import { vInputLabel } from '../../shared/input-label'
import { groupOptions } from './tree'
import '../../shared/drawer.scss'

const props = defineProps<{ visible: boolean, record?: DeviceGroupNode, parentId?: number, groups: DeviceGroupNode[], refresh: () => Promise<void> }>()
defineOptions({ name: 'DeviceGroupEditor' })
const emit = defineEmits<{ 'update:visible': [visible: boolean], saved: [] }>()
const { t } = useI18n()
const user = useUserStore()
const narrow = useNarrowScreen()
const saving = ref(false)
const reloading = ref(false)
const failed = ref(false)
const conflict = ref(false)
let session = ''
let generation = 0
let submittedGeneration = 0
const parentOptions = computed(() => [{ value: 0, label: t('network.device.groups.root') }, ...groupOptions(props.groups, { excludeId: props.record?.id })])
const rules = computed<FormRules>(() => ({
  name: [{ required: true, message: t('network.device.groups.nameRequired') }, { validator: (value, done) => done(value?.trim() ? undefined : t('network.device.groups.nameRequired')) }],
  code: [{ required: true, message: t('network.device.groups.codeRequired') }, { match: /^[a-z][a-z0-9_.-]*$/, message: t('network.device.groups.codeRequired') }],
  position: [{ required: true, type: 'number', min: 0, message: t('network.device.groups.positionRequired') }]
}))
interface GroupModel extends DeviceGroupDraft { id: number, version: number }
const payload = (model: GroupModel): DeviceGroupDraft => ({ code: model.code.trim().toLowerCase(), name: model.name.trim(), parentId: model.parentId, description: model.description, enabled: model.enabled, position: model.position })
const form = useForm<GroupModel, number>({
  idKey: 'id', rules,
  defaultModel: () => ({ id: 0, version: 0, code: '', name: '', parentId: null, description: '', enabled: true, position: 0 }),
  api: { add: model => addDeviceGroup(payload(model)), update: model => updateDeviceGroup(model.id, { ...payload(model), version: model.version }) },
  onError: error => { if (form.isEdit && (error.code === 409 || (isAxiosError(error) && error.response?.status === 409))) conflict.value = true; else failed.value = true },
  onSuccess: () => { if (submittedGeneration === generation && session === user.token && props.visible) { emit('saved'); emit('update:visible', false) } }
})
function load() {
  session = user.token
  conflict.value = false
  failed.value = false
  if (props.record) void form.openEdit({ ...props.record })
  else form.openCreate({ parentId: props.parentId ?? null })
}
async function reload() {
  const current = generation
  reloading.value = true
  try { await props.refresh(); await nextTick(); if (current === generation && props.visible && session === user.token) load() } catch { /* Keep the draft if the refresh failed. */ } finally { reloading.value = false }
}
function close() { if (!saving.value) { generation++; form.close(); emit('update:visible', false) } }
async function save() {
  if (saving.value || !props.visible || conflict.value || session !== user.token) return
  const action = props.record ? 'edit' : 'add'
  if (!user.permisaction.some(value => value === '*:*:*' || value === `network:device-group:${action}`)) return
  form.model.code = form.model.code.trim().toLowerCase()
  saving.value = true
  submittedGeneration = generation
  failed.value = false
  try { await form.submit() } finally { saving.value = false }
}
watch([() => props.visible, () => props.record?.id, () => props.parentId], () => { generation++; if (props.visible) load(); else form.close() }, { immediate: true })
const invalidate = () => { generation++; form.close(); emit('update:visible', false) }
watch(() => user.token, invalidate)
onDeactivated(invalidate)
onBeforeUnmount(invalidate)
</script>

<style scoped>.group-editor__notice { margin-bottom: 20px; }</style>
