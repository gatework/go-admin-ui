<template>
  <PageContainer class="fw-page fw-objects-page">
    <Heading />
    <a-alert
      v-if="!workspace.allowed('list')"
      type="warning"
    >{{ t('networkFirewall.readRequired') }}</a-alert>
    <template v-else>
      <a-alert
        v-if="workspace.failed.value"
        type="warning"
      >{{ t('networkFirewall.loadFailed') }}
        <template #action>
          <a-button @click="load">{{ t('networkFirewall.retry') }}</a-button>
        </template>
      </a-alert>
      <AppTabs :active-key="area" @change="(value: string | number) => navigate({ area: String(value) })">
        <a-tab-pane key="devices" :title="t('networkFirewall.online.devices')" />
        <a-tab-pane key="objects" :title="t('networkFirewall.online.browseObjects')" />
        <a-tab-pane key="collections" :title="t('networkFirewall.online.history')" />
      </AppTabs>
      <Devices v-if="area === 'devices'" :options="options" @started="value => navigate({ area: 'collections', batch: value.id })" @inspect="value => navigate({ area: 'objects', instance: value, snapshot: undefined, object: undefined })" />
      <Collections v-else-if="area === 'collections'" :batch-id="positiveId(route.query.batch)" @select="value => navigate({ batch: value })" @inspect="value => navigate({ area: 'objects', instance: value.instanceId, snapshot: value.snapshotId, object: undefined })" />
      <div v-else class="fw-layout">
        <aside class="fw-sidebar">
          <a-card>
            <a-form
              :model="instances.query"
              layout="vertical"
              @submit-success="instances.search"
            >
              <a-form-item :label="t('networkFirewall.domain')">
                <a-select
                  v-model="instances.query.domainId"
                  @change="instances.search"
                >
                  <a-option
                    v-for="domain in options.domains"
                    :key="domain.id"
                    :value="domain.id"
                  >{{ domain.name }}</a-option>
                </a-select>
              </a-form-item>
              <a-form-item :label="t('networkFirewall.keyword')">
                <a-input
                  v-model="instances.query.keyword"
                  :input-attrs="{ 'aria-label': t('networkFirewall.keyword') }"
                  @press-enter="instances.search"
                />
              </a-form-item>
              <a-button
                html-type="submit"
                :loading="instances.loading"
              >{{ t('common.search') }}</a-button>
            </a-form>
            <a-button
              v-if="workspace.allowed('edit')"
              class="fw-section"
              type="primary"
              @click="createVisible = true"
            >{{ t('networkFirewall.newInstance') }}</a-button>
            <div class="fw-section">
              <a-button
                v-for="item in instances.rows"
                :key="item.id"
                class="fw-list-button"
                :type="instanceId === item.id ? 'primary' : 'text'"
                @click="navigate({ instance: item.id, snapshot: undefined, object: undefined })"
              >{{ item.name }}
                <br>
                <small>{{ item.vendor }} · {{ item.nativeContext || '—' }}</small>
              </a-button>
              <a-empty v-if="!instances.rows.length && !instances.loading" />
              <a-pagination
                simple
                :total="instances.total"
                :current="instances.query.pageIndex"
                :page-size="instances.query.pageSize"
                @change="pageIndex => instances.handlePagination({ page: pageIndex, limit: instances.query.pageSize })"
              />
            </div>
          </a-card>
        </aside>
        <main class="fw-main">
          <a-card v-if="instance">
            <div class="fw-section-title">
              <div>
                <h2>{{ instance.name }}</h2>
                <p class="fw-muted">{{ instance.vendor }} · {{ t(`networkFirewall.${instance.mode}`) }} ·
                  {{ instance.nativeContext || '—' }}
                </p>
                <p class="fw-muted">{{ t('networkFirewall.currentRevision') }}: {{ instance.currentRevision || '—' }}</p>
              </div>
              <a-space wrap>
                <a-button @click="load">{{ t('networkFirewall.refresh') }}</a-button>
                <a-button @click="protectionVisible = true">{{ t('networkFirewall.protection') }}</a-button>
                <a-button
                  v-if="workspace.allowed('import')"
                  type="primary"
                  @click="importVisible = true"
                >{{ t('networkFirewall.import') }}</a-button>
              </a-space>
            </div>
            <a-alert v-if="!instance.currentRevision" type="info">{{ t('networkFirewall.online.noSnapshot') }}<template #action><a-button @click="navigate({ area: 'devices' })">{{ t('networkFirewall.online.devices') }}</a-button></template></a-alert>
            <a-alert v-else-if="instance.settingsVersion === 1" type="info">{{ t('networkFirewall.online.confirmProtection') }}</a-alert>
            <a-alert v-if="selectedSnapshot && !selectedSnapshot.complete" type="warning">{{ t('networkFirewall.online.incompleteSnapshot') }}</a-alert>
            <AppTabs v-model:active-key="tab">
              <a-tab-pane
                key="objects"
                :title="t('networkFirewall.objects')"
              />
              <a-tab-pane
                key="history"
                :title="t('networkFirewall.history')"
              />
              <a-tab-pane
                key="snapshots"
                :title="t('networkFirewall.snapshots')"
              />
            </AppTabs>
            <template v-if="tab === 'objects'">
              <div class="fw-toolbar">
                <span>{{ t('networkFirewall.snapshot') }}</span>
                <a-select
                  :model-value="snapshotId"
                  :placeholder="t('networkFirewall.selectSnapshot')"
                  @change="selectSnapshot"
                >
                  <a-option
                    v-for="snapshot in snapshots.rows"
                    :key="snapshot.id"
                    :value="snapshot.id"
                  >{{ snapshot.revision }} ·
                    {{ t(snapshot.current ? 'networkFirewall.current' : 'networkFirewall.archived') }}
                  </a-option>
                </a-select>
              </div>
              <template v-if="snapshotId">
                <a-descriptions
                  v-if="selectedSnapshot"
                  :column="narrow ? 1 : 2"
                  bordered
                  class="fw-section"
                >
                  <a-descriptions-item
                    v-for="field in ['sourceDigest', 'semanticDigest', 'parserVersion', 'capturedAt', 'software'] as const"
                    :key="field"
                    :label="t(`networkFirewall.${field}`)"
                  >{{ selectedSnapshot[field] || '—' }}</a-descriptions-item>
                </a-descriptions>
                <a-alert
                  v-for="(diagnostic, index) in selectedSnapshot?.diagnostics || []"
                  :key="index"
                  type="warning"
                >{{ diagnostic.message || diagnostic.code }} · {{ diagnostic.object }}</a-alert>
                <AppTabs
                  :active-key="kind"
                  @change="selectKind"
                >
                  <a-tab-pane
                    v-for="item in objectKinds"
                    :key="item"
                    :title="t(`networkFirewall.kinds.${item}`)"
                  />
                </AppTabs>
                <ProTable
                  :table="objects"
                  :panels="false"
                  row-key="id"
                  :actions-width="100"
                >
                  <template #search>
                    <a-form-item
                      v-for="field in objectFilters"
                      :key="field"
                      :label="t(`networkFirewall.${field}`)"
                    >
                      <a-input
                        v-model="objects.query[field]"
                        :input-attrs="{ 'aria-label': t(`networkFirewall.${field}`) }"
                      />
                    </a-form-item>
                  </template>
                  <a-table-column
                    :title="t('networkFirewall.keyword')"
                    data-index="name"
                  />
                  <a-table-column
                    :title="t('networkFirewall.nativeId')"
                    data-index="nativeId"
                  />
                  <a-table-column
                    :title="t('networkFirewall.scope')"
                    data-index="scope"
                  />
                  <a-table-column
                    :title="t('networkFirewall.position')"
                    data-index="position"
                  />
                  <a-table-column
                    :title="t('networkFirewall.summary')"
                    data-index="summary"
                  />
                  <template #actions="{ row }">
                    <a-button
                      type="text"
                      @click="inspect(kind, row.id)"
                    >{{ t('networkFirewall.details') }}</a-button>
                  </template>
                </ProTable>
              </template>
              <a-empty
                v-else
                :description="t('networkFirewall.selectSnapshot')"
              />
            </template>
            <ProTable
              v-else-if="tab === 'history'"
              :table="imports"
              :panels="false"
              row-key="id"
            >
              <template #toolbar>
                <span>{{ t('networkFirewall.history') }}</span>
              </template>
              <a-table-column
                title="ID"
                data-index="id"
              />
              <a-table-column :title="t('networkFirewall.status')">
                <template #cell="{ record }">
                  <StateTag :value="record.status" />
                  <span v-if="record.errorCode"> {{ record.errorCode }}</span>
                </template>
              </a-table-column>
              <a-table-column
                :title="t('networkFirewall.revision')"
                data-index="revision"
              />
              <a-table-column
                :title="t('networkFirewall.createdAt')"
                data-index="createdAt"
              />
              <template #actions="{ row }">
                <a-button
                  v-if="row.status === 'queued' && workspace.allowed('import')"
                  type="text"
                  @click="cancel(row.id)"
                >{{ t('networkFirewall.cancel') }}</a-button>
              </template>
            </ProTable>
            <ProTable
              v-else
              :table="snapshots"
              :panels="false"
              row-key="id"
            >
              <template #toolbar>
                <span>{{ t('networkFirewall.snapshots') }}</span>
              </template>
              <a-table-column
                :title="t('networkFirewall.revision')"
                data-index="revision"
              />
              <a-table-column
                :title="t('networkFirewall.projection')"
                data-index="projectionState"
              />
              <a-table-column :title="t('networkFirewall.complete')">
                <template #cell="{ record }">{{ t(record.complete ? 'networkFirewall.yes' : 'networkFirewall.no') }}</template>
              </a-table-column>
              <a-table-column
                :title="t('networkFirewall.createdAt')"
                data-index="createdAt"
              />
              <template #actions="{ row }">
                <a-button
                  type="text"
                  @click="navigate({ snapshot: row.id, object: undefined }); tab = 'objects'"
                >{{ t('networkFirewall.details') }}</a-button>
              </template>
            </ProTable>
          </a-card>
          <a-card
            v-else
            :loading="workspace.loading.value"
          >
            <a-empty :description="t('networkFirewall.selectInstance')" />
          </a-card>
        </main>
      </div>
    </template>
    <AppDrawer
      v-model:visible="createVisible"
      :title="t('networkFirewall.newInstance')"
      :width="narrow ? '100%' : 1000"
      :footer="false"
    >
      <InstanceEditor
        v-if="createVisible && workspace.allowed('edit')"
        :options="options"
        @saved="created"
      />
    </AppDrawer>
    <AppDrawer
      v-model:visible="importVisible"
      :title="t('networkFirewall.import')"
      :width="narrow ? '100%' : 620"
      :footer="false"
    >
      <Importer
        v-if="importVisible && instance && workspace.allowed('import')"
        :instance="instance"
        :max-bytes="options.limits.maxFileBytes"
        @saved="imported"
      />
    </AppDrawer>
    <AppDrawer
      v-model:visible="protectionVisible"
      :title="t('networkFirewall.protection')"
      :width="narrow ? '100%' : 800"
      :footer="false"
    >
      <Protection
        v-if="protectionVisible && instance"
        :instance="instance"
        :options="options"
        :can-edit="workspace.allowed('edit')"
        @saved="load"
      />
    </AppDrawer>
    <AppDrawer
      :visible="!!objectId && !!snapshotId"
      :title="t('networkFirewall.details')"
      :width="narrow ? '100%' : 800"
      :footer="false"
      @update:visible="value => { if (!value) navigate({ object: undefined }) }"
    >
      <ObjectDetail
        v-if="objectId && snapshotId"
        :id="objectId"
        :snapshot="snapshotId"
        :kind="kind"
        @inspect="inspect"
      />
    </AppDrawer>
  </PageContainer>
</template>
<script setup lang="ts">
import { computed, onActivated, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import PageContainer from '@/components/PageContainer/index.vue'
import ProTable from '@/components/ProTable/index.vue'
import AppDrawer from '@/components/AppDrawer/index.vue'
import AppTabs from '@/components/AppTabs/index.vue'
import { useTable } from '@/composables/useTable'
import { useNarrowScreen } from '@/composables/useNarrowScreen'
import * as api from '@/api/network/firewall'
import type { FirewallObject, ImportJob, Instance, InstanceQuery, ObjectKind, ObjectQuery, Options, Snapshot } from '@/types/firewall'
import { objectKinds } from '@/types/firewall'
import Heading from './heading.vue'
import Devices from './devices.vue'
import Collections from './collections.vue'
import InstanceEditor from './instance-editor.vue'
import Importer from './importer.vue'
import Protection from './protection.vue'
import ObjectDetail from './object-detail.vue'
import StateTag from './state-tag.vue'
import { positiveId, running } from './presentation'
import { usePolling, useWorkspace } from './workspace'
import './style.scss'
defineOptions({ name: 'NetworkFirewallObjects' })
const { t } = useI18n(); const route = useRoute(); const router = useRouter(); const workspace = useWorkspace(); const narrow = useNarrowScreen(); const tab = ref('objects')
const options = ref<Options>({ domains: [], vendors: [], limits: { maxRows: 1000, maxDesignRows: 100, maxFileBytes: 16777216 }, defaultProtocol: 'tcp' }); const instance = ref<Instance>(); const defaultSnapshot = ref<number>()
const instanceId = computed(() => positiveId(route.query.instance)); const snapshotId = computed(() => positiveId(route.query.snapshot) || defaultSnapshot.value); const objectId = computed(() => positiveId(route.query.object)); const kind = computed<ObjectKind>(() => objectKinds.includes(route.query.kind as ObjectKind) ? route.query.kind as ObjectKind : 'rule')
const area = computed(() => ['devices', 'objects', 'collections'].includes(String(route.query.area)) ? String(route.query.area) : instanceId.value ? 'objects' : 'devices')
const createVisible = ref(false); const importVisible = ref(false); const protectionVisible = ref(false); const objectFilters = ['keyword', 'address', 'protocol', 'port', 'zone', 'state'] as const
const instances = useTable<Instance, InstanceQuery>({ api: query => workspace.allowed('list') ? workspace.guard(signal => api.listInstances(query, signal)) : Promise.reject(), defaultQuery: () => ({ keyword: '', domainId: undefined }), pageSize: 10, idKey: 'id', immediate: false, onError: () => { if (workspace.current()) workspace.failed.value = true } })
const snapshots = useTable<Snapshot>({ api: query => instanceId.value ? workspace.guard(signal => api.listSnapshots(instanceId.value!, query, signal)) : Promise.resolve({ code: 200, msg: '', data: { list: [], count: 0 }}), immediate: false, idKey: 'id', onError: () => { if (workspace.current()) workspace.failed.value = true } })
const selectedSnapshot = computed(() => snapshots.rows.find(item => item.id === snapshotId.value))
const imports = useTable<ImportJob>({ api: query => instanceId.value ? workspace.guard(signal => api.listImports(instanceId.value!, query, signal)) : Promise.resolve({ code: 200, msg: '', data: { list: [], count: 0 }}), immediate: false, idKey: 'id', onError: () => { if (workspace.current()) workspace.failed.value = true } })
const objects = useTable<FirewallObject, ObjectQuery>({ api: query => snapshotId.value ? workspace.guard(signal => api.listObjects(snapshotId.value!, kind.value, query, signal)) : Promise.resolve({ code: 200, msg: '', data: { list: [], count: 0 }}), defaultQuery: () => ({}), immediate: false, idKey: 'id', onError: () => { if (workspace.current()) workspace.failed.value = true } })
function navigate(query: Record<string, string | number | undefined>) { void router.push({ query: { ...route.query, ...query }}) }
function selectKind(value: string | number) { navigate({ kind: String(value), object: undefined }) }
function selectSnapshot(value: unknown) { const id = positiveId(value); if (id) navigate({ snapshot: id, object: undefined }) }
function inspect(value: ObjectKind, id: number) { navigate({ kind: value, object: id }) }
async function load() { if (!workspace.allowed('list')) return; const id = instanceId.value; await workspace.read(async signal => Promise.all([api.getOptions(signal), id ? api.getInstance(id, signal) : Promise.resolve(undefined)]), ([config, item]) => { options.value = config.data; instance.value = item?.data; if (!instances.query.domainId) instances.query.domainId = config.data.domains[0]?.id }); if (!workspace.current()) return; await instances.getList(); if (id) { await Promise.all([snapshots.getList(), imports.getList()]); if (instanceId.value === id) defaultSnapshot.value = snapshots.rows.find(item => item.current)?.id || snapshots.rows[0]?.id } }
function created(value: Instance) { createVisible.value = false; navigate({ area: 'objects', instance: value.id, snapshot: undefined, object: undefined }); void instances.getList() }
function imported() { importVisible.value = false; tab.value = 'history'; void load() }
function cancel(id: number) { if (workspace.allowed('import')) void workspace.write(() => api.cancelImport(id), () => { void imports.getList() }) }
watch([instanceId, area, () => route.query.snapshot], ([id, view], [previousId]) => {
  workspace.invalidate()
  if (id !== previousId) { instance.value = undefined; defaultSnapshot.value = undefined; snapshots.rows = []; imports.rows = []; objects.rows = []; createVisible.value = false; importVisible.value = false; protectionVisible.value = false }
  if (view === 'objects') void load()
})
watch(() => [snapshotId.value, kind.value], () => { objects.rows = []; void objects.search() })
usePolling(load, () => imports.rows.some(item => running(item.status)))
onMounted(load); onActivated(() => { if (!instance.value) void load() })
</script>
