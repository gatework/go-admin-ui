<template>
  <AppModal v-model:visible="visible" :title="t('devTools.importTable.title')" width="820px" :mask-closable="false">
    <ProTable
      ref="proTable"
      :table="table"
      :panels="false"
      selection
      row-key="tableName"
      :actions-width="0"
      :scroll="{ y: 320 }"
      @row-click="(row: DBTables) => toggleRow(row)"
    >
      <template #search>
        <a-form-item :label="t('devTools.importTable.tableName')">
          <a-input
            v-model="table.query.tableName"
            :placeholder="t('devTools.importTable.tableNamePlaceholder')"
            allow-clear
          />
        </a-form-item>
        <a-form-item :label="t('devTools.importTable.tableComment')">
          <a-input
            v-model="table.query.tableComment"
            :placeholder="t('devTools.importTable.tableCommentPlaceholder')"
            allow-clear
          />
        </a-form-item>
      </template>

      <a-table-column
        data-index="tableName"
        :title="t('devTools.importTable.tableName')"
        :width="180"
        ellipsis
        tooltip
      />
      <a-table-column
        data-index="tableComment"
        :title="t('devTools.importTable.tableComment')"
        :width="180"
        ellipsis
        tooltip
      />
      <!-- DBTables comes out of INFORMATION_SCHEMA, which names these
           createTime and updateTime rather than createdAt/updatedAt -->
      <a-table-column data-index="createTime" :title="t('common.createdAt')" :width="150" />
      <a-table-column data-index="updateTime" :title="t('devTools.importTable.updatedAt')" :width="150" />
    </ProTable>

    <template #footer>
      <span class="import-table__count">{{ selectedLabel }}</span>
      <a-button @click="visible = false">{{ t('common.dialogCancel') }}</a-button>
      <a-button
        type="primary"
        :loading="importing"
        :disabled="!table.selection.length"
        @click="submit"
      >{{ t('devTools.importTable.submit') }}</a-button>
    </template>
  </AppModal>
</template>

<script setup lang="ts">
import AppModal from '@/components/AppModal/index.vue'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import ProTable from '@/components/ProTable/index.vue'
import { useTable } from '@/composables'
import { msgSuccess } from '@/utils/message'
import { listDbTable, importTable } from '@/api/tools/gen'
import type { DBTables, GenTableQuery } from '@/api/tools/gen'

defineOptions({ name: 'ImportTable' })

const { t } = useI18n()

const visible = defineModel<boolean>({ required: true })
const emit = defineEmits<{ imported: [] }>()

const proTable = ref<{ toggleRowSelection: (row: DBTables, selected?: boolean) => void }>()

// Clicking anywhere on a row ticks it, which is how the previous dialog behaved
const toggleRow = (row: DBTables) => proTable.value?.toggleRowSelection(row)

/**
 * The database's own tables, not the generator's -- so nothing is fetched until
 * the dialog opens, and the list is refreshed each time it does.
 */
const table = useTable<DBTables, GenTableQuery>({
  api: listDbTable,
  idKey: 'tableName',
  immediate: false,
  defaultQuery: () => ({ tableName: undefined, tableComment: undefined })
})

watch(visible, open => {
  if (open) void table.search()
})

/** Count as both the named value and the plural choice, as elsewhere. */
const selectedLabel = computed(() => t(
  'devTools.importTable.selected',
  { count: table.selection.length },
  table.selection.length
))

const importing = ref(false)

const submit = async() => {
  if (importing.value) return
  importing.value = true
  try {
    const tables = table.selection.map(row => String(row.tableName)).join(',')
    await importTable(tables)
    msgSuccess(t('devTools.importTable.imported'))
    visible.value = false
    emit('imported')
  } catch {
    // Reported by the interceptor. The dialog stays open so the selection is
    // not lost -- the previous version closed it on failure as well.
  } finally {
    importing.value = false
  }
}
</script>

<style lang="scss" scoped>
.import-table__count {
  margin-right: auto;
  font-size: 13px;
  color: var(--ga-text-2);
}
</style>
