<template>
  <AppDrawer
    class="network-drawer"
    :visible="visible"
    :title="t('network.device.editTitle')"
    :width="narrow ? '100%' : 640"
    :mask-closable="false"
    :closable="!saving"
    @update:visible="close"
  >
    <a-spin :loading="form.loading" class="device-editor">
      <a-result v-if="loadFailed" status="error" :title="t('network.device.detailFailed')" :subtitle="t('network.device.detailFailedHelp')">
        <template #extra><a-button @click="load">{{ t('network.device.retry') }}</a-button></template>
      </a-result>
      <template v-else-if="form.visible">
        <div class="device-editor__identity">
          <strong>{{ form.model.displayName }}</strong>
          <span>{{ form.model.managementIP }}</span>
        </div>
        <a-alert class="device-editor__notice">{{ t('network.device.sourceReadonly') }}</a-alert>
        <a-alert v-if="conflict" type="warning" class="device-editor__notice" :title="t('network.device.conflict')">
          {{ t('network.device.conflictHelp') }}
          <template #action><a-button :disabled="saving" @click="load">{{ t('network.device.reload') }}</a-button></template>
        </a-alert>
        <a-alert v-else-if="saveFailed" type="error" class="device-editor__notice">{{ t('network.device.saveFailed') }}</a-alert>
        <a-form :ref="form.bindFormRef" :model="form.model" :rules="form.rules" layout="vertical" :disabled="saving" @submit-success="save">
          <div class="device-editor__grid">
            <a-form-item v-input-label="t('network.device.groupSource')" field="groupSource" :label="t('network.device.groupSource')">
              <a-select v-model="form.model.groupSource"><a-option value="auto">{{ t('network.device.groups.auto') }}</a-option><a-option value="manual">{{ t('network.device.groups.manual') }}</a-option></a-select>
              <template #help>{{ form.model.groupSource === 'auto' ? t('network.device.groups.current', { name: form.model.groupName || t('network.device.groups.ungrouped') }) : t('network.device.groups.manualHelp') }}</template>
            </a-form-item>
            <a-form-item v-if="form.model.groupSource === 'manual'" v-input-label="t('network.device.group')" field="groupId" :label="t('network.device.group')">
              <a-select :model-value="form.model.groupId ?? 0" :options="groupChoices" :loading="groupsLoading" :disabled="groupsFailed" allow-search @update:model-value="form.model.groupId = typeof $event === 'number' && $event > 0 ? $event : null" />
            </a-form-item>
            <a-form-item v-input-label="t('network.device.status')" field="status" :label="t('network.device.status')">
              <a-select v-model="form.model.status">
                <a-option v-for="status in deviceStatuses" :key="status" :value="status">{{ t(`network.device.statusValues.${status}`) }}</a-option>
              </a-select>
            </a-form-item>
            <a-form-item v-input-label="t('network.device.classificationSource')" field="classificationSource" :label="t('network.device.classificationSource')" class="device-editor__wide">
              <a-select v-model="form.model.classificationSource"><a-option value="auto">{{ t('network.device.automatic') }}</a-option><a-option value="manual">{{ t('network.device.manual') }}</a-option></a-select>
              <template v-if="form.model.classificationSource === 'auto'" #help>{{ t('network.device.classificationHelp') }}</template>
            </a-form-item>
            <a-form-item v-input-label="t('network.device.deviceType')" field="deviceType" :label="t('network.device.deviceType')">
              <a-select v-model="form.model.deviceType" :placeholder="t('common.selectPlaceholder')" :disabled="form.model.classificationSource === 'auto'" allow-clear>
                <a-option v-for="type in deviceTypes" :key="type" :value="type">{{ t(`network.device.typeValues.${type}`) }}</a-option>
              </a-select>
            </a-form-item>
            <a-form-item v-input-label="t('network.device.deviceRole')" field="deviceRole" :label="t('network.device.deviceRole')">
              <a-select v-model="form.model.deviceRole" :placeholder="t('common.selectPlaceholder')" :disabled="form.model.classificationSource === 'auto'" allow-clear>
                <a-option v-for="role in deviceRoles" :key="role" :value="role">{{ t(`network.device.roleValues.${role}`) }}</a-option>
              </a-select>
            </a-form-item>
            <a-form-item field="owner" :label="t('network.device.owner')">
              <a-input v-model="form.model.owner" :input-attrs="{ 'aria-label': t('network.device.owner') }" :max-length="128" />
            </a-form-item>
            <a-form-item field="contactEmail" :label="t('network.device.contactEmail')">
              <a-input v-model="form.model.contactEmail" :input-attrs="{ 'aria-label': t('network.device.contactEmail') }" :max-length="254" />
            </a-form-item>
            <a-form-item field="contactPhone" :label="t('network.device.contactPhone')">
              <a-input v-model="form.model.contactPhone" :input-attrs="{ 'aria-label': t('network.device.contactPhone') }" :max-length="64" />
            </a-form-item>
            <a-form-item v-input-label="t('network.device.tag')" field="tags" :label="t('network.device.tag')">
              <a-input-tag v-model="form.model.tags" :placeholder="t('network.device.tagPlaceholder')" :max-tag-count="5" allow-clear />
            </a-form-item>
          </div>
          <a-form-item field="notes" :label="t('network.device.notes')">
            <a-textarea v-model="form.model.notes" :textarea-attrs="{ 'aria-label': t('network.device.notes') }" :max-length="4000" :auto-size="{ minRows: 3, maxRows: 8 }" show-word-limit />
          </a-form-item>
          <p class="device-editor__help">{{ t('network.device.assetStatusHelp') }}</p>
        </a-form>
      </template>
    </a-spin>
    <template #footer>
      <a-button :disabled="saving" @click="close">{{ t('common.cancel') }}</a-button>
      <a-button type="primary" :loading="saving" :disabled="!form.visible || form.loading || conflict" @click="save">{{ t('common.dialogConfirm') }}</a-button>
    </template>
  </AppDrawer>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onDeactivated, ref, watch } from 'vue'
import { isAxiosError } from 'axios'
import { useI18n } from 'vue-i18n'
import AppDrawer from '@/components/AppDrawer/index.vue'
import { useForm } from '@/composables'
import { useNarrowScreen } from '@/composables/useNarrowScreen'
import { getDevice, updateDevice } from '@/api/network/device'
import { useUserStore } from '@/stores/user'
import { deviceRoles, deviceStatuses, deviceTypes, type DeviceDraft, type DeviceGroupNode } from '@/types/network'
import type { FormRules } from '@/types/ui'
import { emptyDeviceDraft, toDeviceDraft } from './form'
import { groupOptions } from './groups/tree'
import { vInputLabel } from '../shared/input-label'
import '../shared/drawer.scss'

defineOptions({ name: 'DeviceEditor' })
const props = defineProps<{ visible: boolean, id?: number, groups: DeviceGroupNode[], groupsLoading: boolean, groupsFailed: boolean }>()
const emit = defineEmits<{ 'update:visible': [visible: boolean], saved: [] }>()
const { t } = useI18n()
const user = useUserStore()
const narrow = useNarrowScreen()
const loadFailed = ref(false)
const saveFailed = ref(false)
const conflict = ref(false)
const saving = ref(false)
let session = ''
let generation = 0
let submittedGeneration = 0
const groupChoices = computed(() => [{ value: 0, label: t('network.device.groups.ungrouped') }, ...groupOptions(props.groups, { assignment: true, preserveId: form.model.originalGroupId })])
const rules = computed<FormRules>(() => ({
  status: [{ required: true, message: t('network.device.rules.status') }],
  contactEmail: [{ type: 'email', message: t('network.device.rules.email') }]
}))
interface DeviceEditorModel extends DeviceDraft { displayName: string, managementIP: string, groupName: string, originalGroupId: number | null, originalDeviceType: string, originalDeviceRole: string }
const form = useForm<DeviceEditorModel, number>({
  defaultModel: () => ({ ...emptyDeviceDraft(), displayName: '', managementIP: '', groupName: '', originalGroupId: null, originalDeviceType: '', originalDeviceRole: '' }), idKey: 'id', rules,
  api: {
    get: async id => {
      const response = await getDevice(id)
      return { ...response, data: {
        ...toDeviceDraft(response.data),
        displayName: response.data.name || response.data.hostname || response.data.ip,
        managementIP: response.data.ip,
        groupName: response.data.group,
        originalGroupId: response.data.groupId,
        originalDeviceType: response.data.deviceType,
        originalDeviceRole: response.data.deviceRole
      }}
    },
    update: model => updateDevice(model)
  },
  onError: error => {
    if (form.loading) loadFailed.value = true
    else if (error.code === 409 || (isAxiosError(error) && error.response?.status === 409)) conflict.value = true
    else saveFailed.value = true
  },
  onSuccess: () => {
    if (submittedGeneration !== generation || session !== user.token || !props.visible) return
    emit('saved')
    emit('update:visible', false)
  }
})

function load() {
  if (!props.visible || !props.id || saving.value) return
  session = user.token
  loadFailed.value = false
  saveFailed.value = false
  conflict.value = false
  void form.openEdit(props.id)
}
function close() {
  if (saving.value) return
  form.close()
  emit('update:visible', false)
}
async function save() {
  if (saving.value || form.loading || !form.visible || conflict.value || session !== user.token) return
  if (!user.permisaction.some(permission => permission === '*:*:*' || permission === 'network:device:edit')) return
  saving.value = true
  submittedGeneration = generation
  saveFailed.value = false
  try { await form.submit() } finally { saving.value = false }
}
watch(() => form.model.groupSource, source => { if (source === 'auto') form.model.groupId = form.model.originalGroupId })
watch(() => form.model.classificationSource, source => {
  if (source === 'auto') { form.model.deviceType = form.model.originalDeviceType; form.model.deviceRole = form.model.originalDeviceRole }
})
watch(() => [props.visible, props.id], () => { generation++; if (props.visible) load(); else form.close() }, { immediate: true })
const invalidate = () => { generation++; form.close(); emit('update:visible', false) }
watch(() => user.token, invalidate)
onDeactivated(invalidate)
onBeforeUnmount(invalidate)
</script>

<style scoped lang="scss">
.device-editor { display: block; min-height: 160px; }
.device-editor__identity { display: flex; flex-direction: column; gap: 4px; margin-bottom: 20px; overflow-wrap: anywhere; }
.device-editor__identity strong { color: var(--color-text-1); font-size: var(--motor-font-size-16); }
.device-editor__identity span { color: var(--color-text-2); font-variant-numeric: tabular-nums; }
.device-editor__notice { margin-bottom: 20px; }
.device-editor__grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 20px; }
.device-editor__help { color: var(--color-text-2); line-height: 1.6; margin: 0; }
.device-editor__wide { grid-column: 1 / -1; }
@media (max-width: 767px) { .device-editor__grid { grid-template-columns: minmax(0, 1fr); } }
</style>
