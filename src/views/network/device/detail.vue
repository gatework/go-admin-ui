<template>
  <AppDrawer class="network-drawer" :visible="visible" :title="t('network.device.details')" :width="narrow ? '100%' : 640" @update:visible="emit('update:visible', $event)">
    <a-spin :loading="loading" class="device-detail">
      <a-result v-if="failed" status="error" :title="t('network.device.detailFailed')" :subtitle="t('network.device.detailFailedHelp')">
        <template #extra><a-button @click="load">{{ t('network.device.retry') }}</a-button></template>
      </a-result>
      <template v-else-if="record">
        <div class="device-detail__identity">
          <h2>{{ record.name || record.hostname || record.ip }}</h2>
          <p>{{ record.ip }} · {{ [record.vendor, record.model].filter(Boolean).join(' ') || '—' }}</p>
          <a-tag>{{ t(`network.device.statusValues.${record.status}`) }}</a-tag>
        </div>
        <section v-for="section in sections" :key="section.title" class="device-detail__section">
          <h3>{{ t(`network.device.${section.title}`) }}</h3>
          <p v-if="section.title === 'timeSection'" class="device-detail__help">{{ t('network.device.sourceTimeHelp') }}</p>
          <a-descriptions :column="narrow ? 1 : 2" :bordered="false" layout="vertical">
            <a-descriptions-item v-for="field in section.fields" :key="field" :label="t(`network.device.${field === 'tags' ? 'tag' : field}`)" :span="!narrow && (field === 'description' || field === 'notes') ? 2 : 1">
              <span class="device-detail__value">{{ valueFor(field) }}</span>
            </a-descriptions-item>
          </a-descriptions>
        </section>
        <p class="device-detail__help">{{ t('network.device.assetStatusHelp') }}</p>
      </template>
    </a-spin>
    <template #footer>
      <a-button @click="emit('update:visible', false)">{{ t('common.close') }}</a-button>
      <a-button v-if="canEdit && record" type="primary" @click="emit('edit', record.id)">{{ t('common.edit') }}</a-button>
    </template>
  </AppDrawer>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onDeactivated, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AppDrawer from '@/components/AppDrawer/index.vue'
import { useNarrowScreen } from '@/composables/useNarrowScreen'
import { getDevice } from '@/api/network/device'
import { useUserStore } from '@/stores/user'
import { usePreferencesStore } from '@/stores/preferences'
import { preferenceTime } from '@/utils/preference-time'
import type { Device } from '@/types/network'
import '../shared/drawer.scss'

defineOptions({ name: 'DeviceDetail' })
const props = defineProps<{ visible: boolean, id?: number, canEdit: boolean }>()
const emit = defineEmits<{ 'update:visible': [visible: boolean], edit: [id: number] }>()
const { t } = useI18n()
const narrow = useNarrowScreen()
const user = useUserStore()
const preferences = usePreferencesStore()
const record = ref<Device>()
const loading = ref(false)
const failed = ref(false)
let generation = 0

const sections: { title: string, fields: (keyof Device)[] }[] = [
  { title: 'sourceSection', fields: ['name', 'hostname', 'ip', 'serial', 'vendor', 'model', 'os', 'osVersion', 'location', 'macAddress', 'contact', 'sourceTags', 'description'] },
  { title: 'assetSection', fields: ['group', 'groupSource', 'status', 'classificationSource', 'deviceType', 'deviceRole', 'owner', 'contactEmail', 'contactPhone', 'tags', 'notes'] },
  { title: 'timeSection', fields: ['sourceCreatedAt', 'lastDiscoveredAt', 'lastSyncedAt', 'updatedAt'] }
]

function valueFor(field: keyof Device) {
  const value = record.value?.[field]
  if (Array.isArray(value)) return value.join(', ') || '—'
  if (!value) return '—'
  if (field === 'status') return t(`network.device.statusValues.${value}`)
  if (field === 'deviceType') return t(`network.device.typeValues.${value}`)
  if (field === 'deviceRole') return t(`network.device.roleValues.${value}`)
  if (field === 'groupSource') return t(value === 'auto' ? 'network.device.groups.auto' : 'network.device.groups.manual')
  if (field === 'classificationSource') return t(value === 'auto' ? 'network.device.automatic' : 'network.device.manual')
  if (field.endsWith('At')) {
    return preferenceTime(String(value), preferences.timeZone) ?? String(value).replace('T', ' ')
  }
  return String(value)
}

async function load() {
  if (!props.visible || !props.id) return
  const current = ++generation
  const session = user.token
  record.value = undefined
  failed.value = false
  loading.value = true
  try {
    const response = await getDevice(props.id)
    if (current !== generation || session !== user.token) return
    if (!response.data) failed.value = true
    else record.value = response.data
  } catch {
    if (current === generation && session === user.token) failed.value = true
  } finally {
    if (current === generation) loading.value = false
  }
}

function invalidate() { generation++; record.value = undefined; loading.value = false }
watch(() => [props.visible, props.id], () => { if (props.visible) void load(); else invalidate() }, { immediate: true })
watch(() => user.token, () => { invalidate(); emit('update:visible', false) })
onDeactivated(invalidate)
onBeforeUnmount(invalidate)
</script>

<style scoped lang="scss">
.device-detail { display: block; min-height: 160px; }
.device-detail__identity h2 { margin: 0 0 8px; font-size: var(--motor-font-size-20); overflow-wrap: anywhere; }
.device-detail__identity p, .device-detail__help { color: var(--color-text-2); line-height: 1.6; overflow-wrap: anywhere; }
.device-detail__section { margin-top: 28px; }
.device-detail__section h3 { font-size: var(--motor-base-font-size); margin: 0 0 14px; }
.device-detail__value { overflow-wrap: anywhere; white-space: pre-wrap; }
</style>
