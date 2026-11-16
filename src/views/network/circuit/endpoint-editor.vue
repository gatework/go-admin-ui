<template>
  <section class="circuit-section">
    <h2>{{ t(`networkCircuit.${side}`) }}</h2>
    <div class="circuit-grid">
      <a-form-item v-input-label="label('device')" :field="`${field}.deviceId`" :label="t('networkCircuit.device')">
        <a-select :model-value="model.deviceId ?? undefined" :loading="deviceLoading" :placeholder="t('networkCircuit.devicePlaceholder')" :filter-option="false" allow-search allow-clear @search="searchDevices" @change="changeDevice" @popup-visible-change="open => { if (open && !devices.length) searchDevices('') }">
          <a-option v-for="device in deviceOptions" :key="device.id" :value="device.id">{{ device.name || device.ip }}<span v-if="device.ip"> · {{ device.ip }}</span></a-option>
        </a-select>
      </a-form-item>
      <a-form-item v-for="fieldInfo in textFields" :key="fieldInfo.key" :field="`${field}.${fieldInfo.key}`" :label="t(`networkCircuit.${fieldInfo.label}`)">
        <a-input v-model="model[fieldInfo.key]" :input-attrs="{ 'aria-label': label(fieldInfo.label) }" :max-length="fieldInfo.max" />
      </a-form-item>
    </div>
    <a-alert v-if="deviceFailed" type="warning">
      {{ t('networkCircuit.lookupFailed') }}
      <template #action><a-button @click="searchDevices(deviceKeyword)">{{ t('networkCircuit.retry') }}</a-button></template>
    </a-alert>
    <p class="circuit-help">{{ t('networkCircuit.deviceHelp') }}</p>
    <a-collapse :default-active-key="model.monitoring.hostId ? ['monitoring'] : []">
      <a-collapse-item key="monitoring" :header="t('networkCircuit.monitoring')">
        <CircuitBinding v-model="model.monitoring" :field="`${field}.monitoring`" :side="side" :configured="configured" />
      </a-collapse-item>
    </a-collapse>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { listDevice } from '@/api/network/device'
import type { Device } from '@/types/network'
import type { CircuitEndpoint, CircuitSide } from '@/types/network-circuit'
import { vInputLabel } from '../shared/input-label'
import CircuitBinding from './binding.vue'

const model = defineModel<CircuitEndpoint>({ required: true })
const props = defineProps<{ field: string, side: CircuitSide, configured?: boolean }>()
const { t } = useI18n()
const label = (key: string) => `${t(`networkCircuit.${props.side}`)} ${t(`networkCircuit.${key}`)}`
const textFields = [
  { key: 'name', label: 'endpointName', max: 160 }, { key: 'address', label: 'address', max: 512 }, { key: 'interface', label: 'interface', max: 160 }, { key: 'ip', label: 'ip', max: 45 }, { key: 'contactName', label: 'contactName', max: 128 }, { key: 'contactPhone', label: 'contactPhone', max: 64 }
] as const
const devices = ref<Pick<Device, 'id' | 'name' | 'ip'>[]>([])
const deviceLoading = ref(false)
const deviceFailed = ref(false)
const deviceKeyword = ref('')
let generation = 0
let controller: AbortController | undefined
let timer: ReturnType<typeof setTimeout> | undefined
const deviceOptions = computed(() => model.value.deviceId && !devices.value.some(device => device.id === model.value.deviceId)
  ? [{ id: model.value.deviceId, name: t('networkCircuit.deviceFallback', { id: model.value.deviceId }), ip: '' }, ...devices.value] : devices.value)
function changeDevice(value: unknown) { model.value.deviceId = typeof value === 'number' ? value : null }
function searchDevices(keyword: string) {
  deviceKeyword.value = keyword
  const current = ++generation
  clearTimeout(timer)
  controller?.abort()
  deviceLoading.value = true
  deviceFailed.value = false
  timer = setTimeout(async() => {
    controller = new AbortController()
    try {
      const response = await listDevice({ keyword: keyword.trim(), pageIndex: 1, pageSize: 50 }, controller.signal)
      if (current === generation) devices.value = response.data.list
    } catch { if (current === generation) deviceFailed.value = true } finally { if (current === generation) deviceLoading.value = false }
  }, 250)
}
onBeforeUnmount(() => { generation++; clearTimeout(timer); controller?.abort() })
</script>
