<template>
  <div class="circuit-binding">
    <p class="circuit-help">{{ t('networkCircuit.bindingHelp') }}</p>
    <a-alert v-if="configured === false" type="warning" :title="t('networkCircuit.notConfigured')">{{ t('networkCircuit.notConfiguredHelp') }}</a-alert>
    <a-form-item v-input-label="label('host')" :field="`${field}.hostId`" :label="t('networkCircuit.host')">
      <a-select :model-value="model.hostId || undefined" :disabled="!configured" :loading="hostLoading" :placeholder="t('networkCircuit.hostPlaceholder')" :filter-option="false" allow-search allow-clear @search="searchHosts" @change="selectHost">
        <a-option v-for="host in hostOptions" :key="host.id" :value="host.id" :label="host.name">{{ host.name }}<span class="circuit-binding__key">{{ host.host }}</span></a-option>
        <template #empty>{{ t(hostKeyword ? 'networkCircuit.noHosts' : 'networkCircuit.hostSearchHelp') }}</template>
      </a-select>
      <template #help>{{ t('networkCircuit.hostSearchHelp') }}</template>
    </a-form-item>
    <p v-if="hostsMore" class="circuit-help">{{ t('networkCircuit.narrowSearch') }}</p>
    <a-alert v-if="hostFailed" type="warning">
      {{ t('networkCircuit.lookupFailed') }}
      <template #action><a-button @click="searchHosts(hostKeyword)">{{ t('networkCircuit.retry') }}</a-button></template>
    </a-alert>
    <div class="circuit-grid">
      <a-form-item v-for="direction in directions" :key="direction" v-input-label="label(`${direction}Item`)" :field="`${field}.${direction}ItemId`" :label="t(`networkCircuit.${direction}Item`)">
        <a-select :model-value="model[`${direction}ItemId`] || undefined" :disabled="!configured || !model.hostId" :loading="itemLoading" :placeholder="t('networkCircuit.itemPlaceholder')" :filter-option="false" allow-search allow-clear @search="searchItems" @popup-visible-change="open => { if (open) searchItems('') }" @change="value => selectItem(direction, value)">
          <a-option v-for="item in itemOptions" :key="item.id" :value="item.id" :disabled="item.id === model[direction === 'in' ? 'outItemId' : 'inItemId']" :label="item.name">{{ item.name }}<span class="circuit-binding__key">{{ [item.key, item.units].filter(Boolean).join(' · ') }}</span></a-option>
          <template #empty>{{ t('networkCircuit.noItems') }}</template>
        </a-select>
      </a-form-item>
    </div>
    <p v-if="itemsMore" class="circuit-help">{{ t('networkCircuit.narrowSearch') }}</p>
    <a-alert v-if="itemFailed" type="warning">
      {{ t('networkCircuit.lookupFailed') }}
      <template #action><a-button @click="searchItems(itemKeyword)">{{ t('networkCircuit.retry') }}</a-button></template>
    </a-alert>
    <a-button v-if="model.hostId || model.inItemId || model.outItemId" @click="clearBinding">{{ t('networkCircuit.clearBinding') }}</a-button>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { searchCircuitHosts, searchCircuitItems } from '@/api/network/circuit'
import type { CircuitBinding, CircuitSide, ZabbixHost, ZabbixItem } from '@/types/network-circuit'
import { emptyBinding } from './form'
import { vInputLabel } from '../shared/input-label'

const model = defineModel<CircuitBinding>({ required: true })
defineOptions({ name: 'CircuitBinding' })

const props = defineProps<{ field: string, side: CircuitSide, configured?: boolean }>()
const { t } = useI18n()
const directions = ['in', 'out'] as const
const label = (key: string) => `${t(`networkCircuit.${props.side}`)} ${t(`networkCircuit.${key}`)}`
const hosts = ref<ZabbixHost[]>([])
const items = ref<ZabbixItem[]>([])
const hostLoading = ref(false)
const itemLoading = ref(false)
const hostFailed = ref(false)
const itemFailed = ref(false)
const hostsMore = ref(false)
const itemsMore = ref(false)
const hostKeyword = ref('')
const itemKeyword = ref('')
let hostVersion = 0
let itemVersion = 0
let hostController: AbortController | undefined
let itemController: AbortController | undefined
let hostTimer: ReturnType<typeof setTimeout> | undefined
let itemTimer: ReturnType<typeof setTimeout> | undefined
const hostOptions = computed(() => {
  const selected = model.value
  return selected.hostId && !hosts.value.some(host => host.id === selected.hostId) ? [{ id: selected.hostId, name: selected.hostName || selected.hostId, host: '' }, ...hosts.value] : hosts.value
})
const itemOptions = computed(() => {
  const choices = [...items.value]
  for (const direction of directions) {
    const id = model.value[`${direction}ItemId`]
    if (id && !choices.some(item => item.id === id)) choices.unshift({ id, hostId: model.value.hostId, name: model.value[`${direction}ItemName`] || id, key: '', units: '' })
  }
  return choices
})
function searchHosts(keyword: string) {
  hostKeyword.value = keyword.trim()
  const current = ++hostVersion
  clearTimeout(hostTimer)
  hostController?.abort()
  hosts.value = []
  hostsMore.value = false
  hostFailed.value = false
  hostLoading.value = false
  if (!props.configured || !hostKeyword.value || hostKeyword.value.length > 128) return
  hostLoading.value = true
  hostTimer = setTimeout(async() => {
    hostController = new AbortController()
    try {
      const response = await searchCircuitHosts(hostKeyword.value, hostController.signal)
      if (current !== hostVersion) return
      hosts.value = response.data.items
      hostsMore.value = response.data.hasMore
    } catch { if (current === hostVersion) hostFailed.value = true } finally { if (current === hostVersion) hostLoading.value = false }
  }, 250)
}
function searchItems(keyword: string) {
  itemKeyword.value = keyword.trim()
  const current = ++itemVersion
  const hostId = model.value.hostId
  clearTimeout(itemTimer)
  itemController?.abort()
  items.value = []
  itemsMore.value = false
  itemFailed.value = false
  itemLoading.value = false
  if (!props.configured || !hostId || itemKeyword.value.length > 128) return
  itemLoading.value = true
  itemTimer = setTimeout(async() => {
    itemController = new AbortController()
    try {
      const response = await searchCircuitItems(hostId, itemKeyword.value, itemController.signal)
      if (current !== itemVersion || hostId !== model.value.hostId) return
      items.value = response.data.items
      itemsMore.value = response.data.hasMore
    } catch { if (current === itemVersion) itemFailed.value = true } finally { if (current === itemVersion) itemLoading.value = false }
  }, 200)
}
function selectHost(value: unknown) {
  const id = typeof value === 'string' ? value : ''
  if (id === model.value.hostId) return
  const host = hosts.value.find(entry => entry.id === id)
  model.value = { ...emptyBinding(), hostId: host?.id || '', hostName: host?.name || '' }
}
function selectItem(direction: 'in' | 'out', value: unknown) {
  const item = itemOptions.value.find(entry => entry.id === value)
  model.value = { ...model.value, [`${direction}ItemId`]: item?.id || '', [`${direction}ItemName`]: item?.name || '' }
}
function clearBinding() { model.value = emptyBinding() }
watch(() => model.value.hostId, () => searchItems(''), { immediate: true })
onBeforeUnmount(() => { hostVersion++; itemVersion++; clearTimeout(hostTimer); clearTimeout(itemTimer); hostController?.abort(); itemController?.abort() })
</script>

<style scoped>
.circuit-binding > .arco-alert { margin-bottom: 16px; }
.circuit-binding__key { display: block; color: var(--color-text-2); font-size: var(--motor-font-size-12); overflow-wrap: anywhere; }
</style>
