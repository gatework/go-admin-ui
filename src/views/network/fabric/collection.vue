<template>
  <AppDrawer :visible="visible" class="fabric-drawer" :title="t('networkFabric.collect')" :width="narrow ? '100%' : 860" @update:visible="emit('update:visible', $event)">
    <section v-if="allowed('edit')">
      <h2>{{ t('networkFabric.settings') }}</h2>
      <p class="fabric-hint">{{ t('networkFabric.settingsHelp') }}</p>
      <a-alert v-if="outdated || conflict" type="warning">
        <p>{{ t(conflict ? 'networkFabric.settingsConflict' : 'networkFabric.settingsUpdated') }}</p>
        <a-button :loading="reloading" :disabled="pending" @click="reloadSettings">
          {{ t('networkFabric.loadLatestSettings') }}
        </a-button>
        <p v-if="reloadFailed">{{ t('networkFabric.settingsReloadFailed') }}</p>
      </a-alert>
      <a-form :model="settings" layout="vertical" :disabled="pending || reloading || blocked">
        <a-form-item :label="t('networkFabric.collectionEnabled')">
          <a-switch v-model="settings.collectionEnabled" :aria-label="t('networkFabric.collectionEnabled')" />
        </a-form-item>
        <div class="fabric-inline-fields">
          <a-form-item :label="t('networkFabric.runtimeMinutes')">
            <a-input-number
              v-model="settings.runtimeMinutes"
              model-event="input"
              :min="1"
              :max="1440"
              :input-attrs="{ 'aria-label': t('networkFabric.runtimeMinutes') }"
            />
          </a-form-item>
          <a-form-item :label="t('networkFabric.configMinutes')">
            <a-input-number
              v-model="settings.configMinutes"
              model-event="input"
              :min="1"
              :max="1440"
              :input-attrs="{ 'aria-label': t('networkFabric.configMinutes') }"
            />
          </a-form-item>
        </div>
        <a-button :loading="pending" :disabled="blocked || !valid" @click="saveSettings">
          {{ t('common.dialogConfirm') }}
        </a-button>
      </a-form>
    </section>
    <section v-if="allowed('collect')" class="fabric-section"><h2>{{ t('networkFabric.collect') }}</h2><div class="fabric-action-bar"><a-select v-model="mode" v-input-label="t('networkFabric.mode')" :disabled="pending" style="max-width:260px"><a-option v-for="value in modes" :key="value" :value="value">{{ t(`networkFabric.modes.${value}`) }}</a-option></a-select><a-button type="primary" :loading="pending" @click="collect">{{ t('networkFabric.collect') }}</a-button></div></section>
    <section class="fabric-section"><div class="fabric-section-heading"><h2>{{ t('networkFabric.jobs') }}</h2><a-button @click="refresh">{{ t('networkFabric.refreshJobs') }}</a-button></div><ProTable :table="jobs" :panels="false" row-key="id"><a-table-column data-index="id" :title="t('networkFabric.job')" :width="100" /><a-table-column data-index="mode" :title="t('networkFabric.mode')" :width="160"><template #cell="{ record }">{{ t(`networkFabric.modes.${record.mode}`) }}</template></a-table-column><a-table-column data-index="status" :title="t('networkFabric.state')" :width="140"><template #cell="{ record }"><a-button type="text" @click="showJob(record.id)"><StateTag :value="record.status" /></a-button></template></a-table-column><a-table-column data-index="createdAt" :title="t('common.createdAt')" :width="125"><template #cell="{ record }"><DateCell :value="record.createdAt" /></template></a-table-column></ProTable></section>
    <section v-if="selectedJob" class="fabric-section"><h2>{{ t('networkFabric.job') }} #{{ selectedJob.id }}</h2><p class="fabric-secondary">{{ t('networkFabric.requestId') }}: {{ selectedJob.requestKey }}</p><div v-for="target in selectedJob.targets" :key="target.deviceId" class="fabric-mobile-cell"><strong>#{{ target.deviceId }}</strong><StateTag :value="target.status" /><span>{{ target.errorCode }}</span></div></section>
    <template #footer><a-button @click="emit('update:visible', false)">{{ t('common.close') }}</a-button></template>
  </AppDrawer>
</template>
<script setup lang="ts">
import { inject, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AppDrawer from '@/components/AppDrawer/index.vue'
import ProTable from '@/components/ProTable/index.vue'
import DateCell from '@/components/DateCell/index.vue'
import { useTable } from '@/composables'
import { useNarrowScreen } from '@/composables/useNarrowScreen'
import { useUserStore } from '@/stores/user'
import { listCollection, addCollection, getCollection } from '@/api/network/fabric'
import type { Collection, CollectionMode, Fabric } from '@/types/network-fabric'
import { vInputLabel } from '../shared/input-label'
import type { FabricTasks } from './use-tasks'
import { useOperation } from './use-operation'
import { useSettings } from './use-settings'
import StateTag from './state-tag.vue'
defineOptions({ name: 'FabricCollection' })
const props = defineProps<{ visible: boolean, fabric: Fabric }>()
const emit = defineEmits<{ 'update:visible': [value: boolean], changed: [] }>()
const { t } = useI18n()
const tasks = inject<FabricTasks>('fabricTasks')
const user = useUserStore()
const narrow = useNarrowScreen()
const operation = useOperation()
const { pending, run } = operation
const allowed = (action: string) => user.permisaction.some(value => value === '*:*:*' || value === `network:fabric:${action}`)
const refreshFabric = inject<() => Promise<void>>('refreshFabric')
const { settings, outdated, conflict, reloading, reloadFailed, valid, blocked, save: saveSettings, reload: reloadSettings } = useSettings(() => props.fabric, () => props.visible, () => allowed('edit'), operation, refreshFabric, () => emit('changed'))
const modes: CollectionMode[] = ['all', 'runtime', 'configuration']
const mode = ref<CollectionMode>('all')
const selectedJob = ref<Collection>()
let requestKey = crypto.randomUUID()
const jobs = useTable<Collection>({ api: query => listCollection(props.fabric.id, query), idKey: 'id' })
watch(() => jobs.rows, rows => { for (const row of rows) tasks?.track('collection', row) })
watch(() => tasks?.revision.value, () => { void jobs.getList() })
watch(() => tasks?.collections.value, rows => { if (selectedJob.value && rows?.[selectedJob.value.id]) selectedJob.value = rows[selectedJob.value.id] })
function collect() { if (!allowed('collect')) return; void run(() => addCollection(props.fabric.id, { requestKey, mode: mode.value }), response => { selectedJob.value = response.data; tasks?.track('collection', response.data); requestKey = crypto.randomUUID(); void jobs.getList(); emit('changed') }) }
function showJob(id: number) { void run(() => getCollection(id), response => { selectedJob.value = response.data; tasks?.track('collection', response.data) }) }
function refresh() { void jobs.getList(); if (selectedJob.value) showJob(selectedJob.value.id) }
watch(mode, () => { requestKey = crypto.randomUUID() })
</script>
