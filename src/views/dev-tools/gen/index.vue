<template>
  <PageContainer>
    <ProTable :table="table" selection row-key="tableId" :actions-width="170">
      <template #search>
        <a-form-item :label="$t('devTools.gen.tableName')">
          <a-input
            v-model="table.query.tableName"
            :placeholder="$t('devTools.gen.tableNamePlaceholder')"
            allow-clear
          />
        </a-form-item>
        <a-form-item :label="$t('devTools.gen.tableComment')">
          <a-input
            v-model="table.query.tableComment"
            :placeholder="$t('devTools.gen.tableCommentPlaceholder')"
            allow-clear
          />
        </a-form-item>
      </template>

      <template #toolbar>
        <a-button type="primary" @click="importVisible = true">{{ $t('devTools.gen.import') }}</a-button>
        <a-button
          status="danger"
          :disabled="table.multiple"
          @click="remove(table.selectedIds)"
        >{{ $t('common.delete') }}</a-button>
      </template>

      <a-table-column :title="$t('devTools.gen.tableId')" data-index="tableId" :width="70" />
      <a-table-column
        :title="$t('devTools.gen.tableName')"
        data-index="tableName"
        :width="150"
        ellipsis
        tooltip
      />
      <a-table-column
        :title="$t('devTools.gen.tableComment')"
        data-index="tableComment"
        :width="150"
        ellipsis
        tooltip
      />
      <a-table-column
        :title="$t('devTools.gen.className')"
        data-index="className"
        :width="150"
        ellipsis
        tooltip
      />
      <a-table-column :title="$t('common.createdAt')" data-index="createdAt" :width="110">
        <template #cell="{ record: row }"><DateCell :value="row.createdAt" /></template>
      </a-table-column>

      <!--
        Six actions is four more than a pinned column can carry: at 340px it was
        the widest column in the table, and a pinned column covers its neighbours
        rather than scrolling past them. The two that get used land as buttons,
        the rest behind a menu.
      -->
      <template #actions="{ row }">
        <a-button type="text" @click="edit(row)">{{ $t('devTools.gen.edit') }}</a-button>
        <a-button type="text" @click="preview(row)">{{ $t('devTools.gen.preview') }}</a-button>
        <AppDropdown trigger="click" @select="(command: unknown) => run(command as Command, row)">
          <a-button class="row-icon-action" :title="$t('devTools.gen.moreActions')" type="text">
            <icon-more />
          </a-button>
          <template #content>

            <a-doption value="project">{{ $t('devTools.gen.generateToProject') }}</a-doption>
            <a-doption value="db">{{ $t('devTools.gen.generateConfig') }}</a-doption>
            <a-doption value="api">{{ $t('devTools.gen.generateMigration') }}</a-doption>
            <a-doption value="delete">{{ $t('common.delete') }}</a-doption>

          </template>
        </AppDropdown>
      </template>
    </ProTable>

    <!--
      v-model binds `previewOpen`. It used to bind `open`, which no data property
      ever declared, so Vue warned on every render and the dialog never appeared:
      clicking Preview fetched every template and showed none of them.
    -->
    <AppModal
      v-model:visible="previewOpen"
      :title="$t('devTools.gen.previewTitle')"
      fullscreen
      :mask-closable="false"
    >
      <div class="gen-preview">
        <div class="gen-preview__tabs">
          <a-tag
            v-for="name in templateNames"
            :key="name"
            :color="name === activeTemplate ? 'arcoblue' : 'gray'"
            class="gen-preview__tab"
            @click="activeTemplate = name"
          >{{ shortName(name) }}</a-tag>
        </div>
        <Codemirror
          :model-value="templates[activeTemplate] ?? ''"
          :tab-size="4"
          disabled
          :style="{ height: 'calc(100vh - 210px)' }"
        />
      </div>
    </AppModal>

    <ImportTable v-model="importVisible" @imported="table.search()" />
  </PageContainer>
</template>

<script setup lang="ts">
import AppDropdown from '@/components/AppDropdown/index.vue'
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { Codemirror } from 'vue-codemirror'

import AppModal from '@/components/AppModal/index.vue'
import PageContainer from '@/components/PageContainer/index.vue'
import ProTable from '@/components/ProTable/index.vue'
import DateCell from '@/components/DateCell/index.vue'
import ImportTable from './importTable.vue'
import { useTable, useRemove } from '@/composables'
import { msgSuccess } from '@/utils/message'

import {
  listTable, previewTable, delTable, toDBTable, toProjectTableCheckRole, apiToFile
} from '@/api/tools/gen'
import type { SysTables, GenTableQuery } from '@/api/tools/gen'

// Must match the menu_name the backend serves, or keep-alive silently misses
defineOptions({ name: 'Gen' })

const { t } = useI18n()
const router = useRouter()

const table = useTable<SysTables, GenTableQuery>({
  api: listTable,
  idKey: 'tableId',
  defaultQuery: () => ({ tableName: undefined, tableComment: undefined })
})

const { remove } = useRemove({
  api: delTable,
  // A function, so the sentence is built when the dialog opens rather than when
  // the page was set up -- the language may have changed in between
  confirmText: count => t('devTools.gen.deleteConfirm', { count }, count),
  onSuccess: () => table.getList()
})

const importVisible = ref(false)

const edit = (row: SysTables) =>
  router.push({ path: '/dev-tools/editTable', query: { tableId: String(row.tableId) }})

// ── Preview ───────────────────────────────────────────────────────
const previewOpen = ref(false)
const templates = ref<Record<string, string>>({})
const activeTemplate = ref('')

const templateNames = computed(() => Object.keys(templates.value))

/** `template/api.go.template` reads better as `api.go`. */
const shortName = (path: string) =>
  path.slice(path.lastIndexOf('/') + 1).replace(/\.template$/, '')

const preview = async(row: SysTables) => {
  try {
    const response = await previewTable(Number(row.tableId))
    templates.value = (response.data ?? {}) as Record<string, string>
    activeTemplate.value = templateNames.value[0] ?? ''
    previewOpen.value = true
  } catch {
    // Reported by the interceptor
  }
}

// ── The overflow menu ─────────────────────────────────────────────
type Command = 'project' | 'db' | 'api' | 'delete'

const GENERATORS = {
  // 0 means 'do not check the role table', which is what `false` meant here
  project: (id: number) => toProjectTableCheckRole(id, 0),
  db: (id: number) => toDBTable(id),
  api: (id: number) => apiToFile(id)
} as const

/** Guards the whole menu: generating twice writes the same files twice. */
let generating = false

const run = async(command: Command, row: SysTables) => {
  if (command === 'delete') {
    void remove(row.tableId as number)
    return
  }
  if (generating) return
  generating = true
  try {
    await GENERATORS[command](Number(row.tableId))
    msgSuccess(t('devTools.gen.generated'))
  } catch {
    // Reported by the interceptor
  } finally {
    generating = false
  }
}
</script>

<style lang="scss" scoped>
.gen-preview {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.gen-preview__tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.gen-preview__tab {
  cursor: pointer;
}
</style>
