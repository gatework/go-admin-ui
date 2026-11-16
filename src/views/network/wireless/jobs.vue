<template><ProTable :table="table" row-key="id"><a-table-column data-index="id" :title="t('networkWireless.jobId')" :width="100" /><a-table-column data-index="status" :title="t('networkWireless.status')" :width="120"><template #cell="{ record }"><StateTag :value="record.status" /></template></a-table-column><a-table-column data-index="dimensions" :title="t('networkWireless.dimensions')"><template #cell="{ record }">{{ record.dimensions.map((name: string) => t(`networkWireless.dimension.${name}`)).join(' · ') }}</template></a-table-column><a-table-column data-index="apNames" :title="t('networkWireless.selectedAPs')"><template #cell="{ record }">{{ record.apNames?.join(' · ') || '—' }}</template></a-table-column><a-table-column data-index="results" :title="t('networkWireless.results')"><template #cell="{ record }"><div v-for="result in record.results || []" :key="result.name">{{ t(`networkWireless.dimension.${result.name}`) }} <StateTag :value="result.status" /> {{ result.count }}<div class="wireless-muted">{{ result.issues?.join(' · ') }}</div></div><span class="wireless-muted">{{ record.errorCode }}</span></template></a-table-column><a-table-column data-index="createdAt" :title="t('networkWireless.observedAt')" :width="140"><template #cell="{ record }"><DateCell :value="record.createdAt" /></template></a-table-column></ProTable></template>
<script setup lang="ts">
defineOptions({ name: 'WirelessJobs' })
import { watch } from 'vue'
import { useI18n } from 'vue-i18n'
import ProTable from '@/components/ProTable/index.vue'
import DateCell from '@/components/DateCell/index.vue'
import { listCollection } from '@/api/network/wireless'
import type { Collection } from '@/types/network-wireless'
import StateTag from './state-tag.vue'
import { useSession } from './session'
import { useListing } from './listing'
const props = defineProps<{ controller: number, refresh: number }>()
const { t } = useI18n()
const { active } = useSession()
const { table } = useListing<Collection>({ active, api: (query, signal) => listCollection(props.controller, query, signal) })
watch(() => props.refresh, () => { if (active.value && !table.loading) void table.getList() })
</script>
