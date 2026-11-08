<template>
  <div class="wireless-resources">
    <a-alert v-if="failed" type="warning">{{ t(table.rows.length ? 'networkWireless.loadFailed' : 'networkWireless.readFailed') }}</a-alert>
    <ProTable :table="table" row-key="id" :panels="!compact" :actions-width="110">
      <template #search>
        <a-form-item :label="t('networkWireless.keyword')"><a-input v-model="table.query.keyword" allow-clear :input-attrs="{ 'aria-label': t('networkWireless.keyword') }" /></a-form-item>
        <a-form-item :label="t('networkWireless.ssid')"><a-input v-model="table.query.ssid" allow-clear /></a-form-item>
        <a-form-item :label="t('networkWireless.ap')"><a-input v-model="table.query.ap" allow-clear /></a-form-item>
        <a-form-item :label="t('networkWireless.band')"><a-input v-model="table.query.band" allow-clear /></a-form-item>
        <a-form-item :label="t('networkWireless.vlan')"><a-input v-model="table.query.vlan" allow-clear /></a-form-item>
        <a-form-item :label="t('networkWireless.status')"><a-input v-model="table.query.status" allow-clear /></a-form-item>
      </template>
      <template #toolbar><span class="wireless-muted">{{ t('networkWireless.scope') }}</span><a-button v-if="canExport && controller" :loading="exporting" @click="download">{{ t('networkWireless.export') }}</a-button></template>
      <a-table-column v-if="!controller" data-index="controllerName" :title="t('networkWireless.controllers')" :width="160" />
      <a-table-column data-index="fields.apName" :title="t('networkWireless.ap')" :width="170" ellipsis tooltip><template #cell="{ record }"><strong>{{ record.localAlias || record.fields.apName || '—' }}</strong><div class="wireless-muted">{{ record.fields.name || record.fields.apId }}</div></template></a-table-column>
      <a-table-column v-if="kind === 'clients'" data-index="fields.mac" :title="t('networkWireless.mac')" :width="155" />
      <a-table-column v-if="kind === 'access-points' || kind === 'clients'" data-index="fields.ip" :title="t('networkWireless.ip')" :width="145" />
      <a-table-column v-if="kind !== 'access-points'" data-index="fields.radioId" :title="t('networkWireless.radio')" :width="90" />
      <a-table-column v-if="kind === 'clients' || kind === 'bsses'" data-index="fields.ssid" :title="t('networkWireless.ssid')" :width="130" ellipsis tooltip />
      <a-table-column v-if="kind === 'clients' || kind === 'bsses'" data-index="fields.vlan" :title="t('networkWireless.vlan')" :width="90" />
      <a-table-column v-if="kind === 'access-points'" data-index="fields.model" :title="t('networkWireless.model')" :width="140" />
      <a-table-column v-if="kind !== 'access-points'" data-index="fields.band" :title="t('networkWireless.band')" :width="90" />
      <a-table-column v-if="kind === 'radios'" data-index="fields.channel" :title="t('networkWireless.channel')" :width="90" />
      <a-table-column v-if="kind === 'clients'" data-index="fields.signal" :title="t('networkWireless.signal')" :width="110" />
      <a-table-column data-index="health" :title="t('networkWireless.status')" :width="120" card-role="badge"><template #cell="{ record }"><StateTag :value="record.health" /><div class="wireless-muted">{{ record.fields.status || record.fields.adminStatus || '—' }}</div></template></a-table-column>
      <a-table-column data-index="coverage.state" :title="t('networkWireless.coverage')" :width="130"><template #cell="{ record }"><StateTag :value="record.coverage.state" /><div v-if="record.missing">{{ t('networkWireless.missing') }}</div></template></a-table-column>
      <a-table-column data-index="observedAt" :title="t('networkWireless.observedAt')" :width="130"><template #cell="{ record }"><DateCell :value="record.observedAt" /></template></a-table-column>
      <template #actions="{ row }"><a-button type="text" @click="$emit('inspect', row)">{{ t('networkWireless.inspect') }}</a-button></template>
    </ProTable>
  </div>
</template>
<script setup lang="ts">
defineOptions({ name: 'WirelessResources' })
import { watch } from 'vue'
import { useI18n } from 'vue-i18n'
import ProTable from '@/components/ProTable/index.vue'
import DateCell from '@/components/DateCell/index.vue'
import { listResource, exportResource } from '@/api/network/wireless'
import type { Kind, Resource, WirelessQuery } from '@/types/network-wireless'
import StateTag from './state-tag.vue'
import { downloadCSV } from './presentation'
import { useSession } from './session'
import { useListing } from './listing'
const props = withDefaults(defineProps<{ controller?: number, kind: Kind, refresh?: number, canExport?: boolean, compact?: boolean, filters?: WirelessQuery }>(), { controller: undefined, refresh: 0, filters: () => ({}) })
const emit = defineEmits<{ inspect: [row: Resource], filters: [query: WirelessQuery] }>()
const { t } = useI18n()
const { run, pending: exporting, active } = useSession()
const keys = ['keyword', 'ssid', 'band', 'ap', 'vlan', 'status'] as const
const filters = () => Object.fromEntries(keys.map(key => [key, props.filters[key] || ''])) as WirelessQuery
const { table, failed } = useListing<Resource>({ active, defaultQuery: () => ({ keyword: '', ssid: '', band: '', ap: '', vlan: '', status: '' }), api: (query, signal) => listResource(props.controller, props.kind, query, signal), accepted: query => emit('filters', query) })
Object.assign(table.query, filters())
watch(() => props.filters, () => {
  const next = filters()
  if (keys.every(key => table.query[key] === next[key])) return
  Object.assign(table.query, next); if (active.value) void table.search()
}, { deep: true })
watch(() => props.refresh, () => { if (active.value && !table.loading) void table.getList() })
async function download() { try { const result = await run(signal => exportResource(props.controller!, props.kind, { ...table.query }, signal)); if (result) downloadCSV(result.data, `wireless-${props.kind}.csv`) } catch { /* interceptor reports */ } }
</script>
