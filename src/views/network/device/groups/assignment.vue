<template>
  <AppDrawer class="network-drawer" :visible="visible" :title="t('network.device.groups.assign')" :width="narrow ? '100%' : 480" :mask-closable="false" :closable="!saving" @update:visible="close">
    <p class="assignment__summary">{{ t('network.device.groups.selectedCount', { count: records.length }) }}</p>
    <a-alert v-if="conflict" type="warning" class="assignment__notice" :title="t('network.device.groups.assignmentConflict')">{{ t('network.device.groups.assignmentConflictHelp') }}</a-alert>
    <a-alert v-else-if="failed" type="error" class="assignment__notice">{{ t('network.device.saveFailed') }}</a-alert>
    <a-form :model="draft" layout="vertical" :disabled="saving" @submit-success="save">
      <a-form-item v-input-label="t('network.device.groupSource')" :label="t('network.device.groupSource')">
        <a-select v-model="draft.groupSource"><a-option value="auto">{{ t('network.device.groups.auto') }}</a-option><a-option value="manual">{{ t('network.device.groups.manual') }}</a-option></a-select>
      </a-form-item>
      <a-form-item v-if="draft.groupSource === 'manual'" v-input-label="t('network.device.group')" :label="t('network.device.group')">
        <a-select :model-value="draft.groupId ?? 0" :options="options" allow-search @update:model-value="draft.groupId = typeof $event === 'number' && $event > 0 ? $event : null" />
      </a-form-item>
      <p class="assignment__help">{{ t(draft.groupSource === 'auto' ? 'network.device.groups.autoHelp' : 'network.device.groups.manualHelp') }}</p>
    </a-form>
    <template #footer>
      <a-button :disabled="saving" @click="close">{{ t('common.cancel') }}</a-button>
      <a-button v-if="conflict" type="primary" @click="refreshSelection">{{ t('network.device.groups.refreshSelection') }}</a-button>
      <a-button v-else type="primary" :loading="saving" :disabled="!records.length || records.length > 200" @click="save">{{ t('common.dialogConfirm') }}</a-button>
    </template>
  </AppDrawer>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onDeactivated, reactive, ref, watch } from 'vue'
import { isAxiosError } from 'axios'
import { useI18n } from 'vue-i18n'
import AppDrawer from '@/components/AppDrawer/index.vue'
import { useNarrowScreen } from '@/composables/useNarrowScreen'
import { assignDeviceGroup } from '@/api/network/device'
import { useUserStore } from '@/stores/user'
import { msgSuccess } from '@/utils/message'
import type { Device, DeviceGroupAssignment, DeviceGroupNode } from '@/types/network'
import { vInputLabel } from '../../shared/input-label'
import { groupOptions } from './tree'
import '../../shared/drawer.scss'

const props = defineProps<{ visible: boolean, records: Device[], groups: DeviceGroupNode[] }>()
defineOptions({ name: 'DeviceGroupAssignment' })
const emit = defineEmits<{ 'update:visible': [visible: boolean], saved: [], refresh: [] }>()
const { t } = useI18n()
const user = useUserStore()
const narrow = useNarrowScreen()
const saving = ref(false)
const failed = ref(false)
const conflict = ref(false)
const draft = reactive<Pick<DeviceGroupAssignment, 'groupId' | 'groupSource'>>({ groupId: null, groupSource: 'auto' })
const options = computed(() => [{ value: 0, label: t('network.device.groups.ungrouped') }, ...groupOptions(props.groups, { assignment: true })])
let generation = 0
let session = ''
watch(() => props.visible, visible => {
  generation++
  if (!visible) return
  session = user.token
  failed.value = false
  conflict.value = false
  const first = props.records[0]
  draft.groupSource = first?.groupSource ?? 'auto'
  const shared = props.records.every(record => record.groupId === first?.groupId)
  draft.groupId = shared && props.groups.length ? first?.groupId ?? null : null
}, { immediate: true })
function close() { if (!saving.value) emit('update:visible', false) }
function refreshSelection() { close(); emit('refresh') }
async function save() {
  if (saving.value || !props.visible || conflict.value || !props.records.length || props.records.length > 200 || session !== user.token) return
  if (!user.permisaction.some(value => value === '*:*:*' || value === 'network:device:edit')) return
  const current = generation
  const token = user.token
  saving.value = true
  failed.value = false
  try {
    const response = await assignDeviceGroup({ devices: props.records.map(({ id, version }) => ({ id, version })), groupId: draft.groupSource === 'auto' ? null : draft.groupId, groupSource: draft.groupSource })
    if (current !== generation || token !== user.token) return
    msgSuccess(t('network.device.groups.assigned', { count: response.data.updated }))
    emit('saved')
    emit('update:visible', false)
  } catch(error) {
    if (current !== generation || token !== user.token) return
    if ((error as { code?: number }).code === 409 || (isAxiosError(error) && error.response?.status === 409)) conflict.value = true
    else failed.value = true
  } finally { if (current === generation) saving.value = false }
}
const invalidate = () => { generation++; saving.value = false; emit('update:visible', false) }
watch(() => user.token, invalidate)
onDeactivated(invalidate)
onBeforeUnmount(invalidate)
</script>

<style scoped>
.assignment__summary { margin: 0 0 20px; color: var(--color-text-1); }
.assignment__notice { margin-bottom: 20px; }
.assignment__help { color: var(--color-text-2); line-height: 1.6; }
</style>
