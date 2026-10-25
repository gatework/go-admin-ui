<template>
  <a-card>
    <AppTabs v-model:active-key="activeName" :lazy-load="false">
      <a-tab-pane key="basic" :title="$t('devTools.editTable.tabBasic')">
        <BasicInfoForm ref="basicForm" v-model="info" />
      </a-tab-pane>
      <a-tab-pane key="cloum" :title="$t('devTools.editTable.tabColumns')">
        <a-alert
          :title="$t('devTools.editTable.hiddenColumns')"
          type="warning"
          show-icon
        />
        <a-table :data="columns" :pagination="false" :scroll="{ x: 2800, y: 'calc(100vh - 300px)' }"><template #columns>
          <a-table-column fixed="left" :title="$t('devTools.editTable.index')" :width="50"><template #cell="{ rowIndex }">{{ rowIndex + 1 }}</template></a-table-column>
          <a-table-column
            fixed="left"
            :title="$t('devTools.editTable.columnName')"
            data-index="columnName"
            :width="150"
            ellipsis
            tooltip
          />
          <a-table-column fixed="left" :title="$t('devTools.editTable.columnComment')" :width="150">
            <template #cell="scope">
              <a-input v-model="scope.record.columnComment" />
            </template>
          </a-table-column>
          <a-table-column
            :title="$t('devTools.editTable.columnType')"
            data-index="columnType"
            :width="120"
            ellipsis
            tooltip
          />
          <a-table-column :title="$t('devTools.editTable.goType')" :width="120">
            <template #cell="scope">
              <a-select v-model="scope.record.goType">
                <a-option label="int64" value="int64" />
                <a-option label="string" value="string" />
                <!-- <a-option label="int" value="int" />
                <a-option label="bool" value="bool" /> -->
              </a-select>
            </template>
          </a-table-column>
          <a-table-column :title="$t('devTools.editTable.goField')" :width="150">
            <template #cell="scope">
              <a-input v-model="scope.record.goField" />
            </template>
          </a-table-column>
          <a-table-column :title="$t('devTools.editTable.jsonField')" :width="150">
            <template #cell="scope">
              <a-input v-model="scope.record.jsonField" />
            </template>
          </a-table-column>
          <a-table-column :title="$t('devTools.editTable.colWidth')" :width="150">
            <template #cell="scope">
              <a-input-number
                :model-value="colWidthModel(scope.record)"
                :min="40"
                :max="800"
                :placeholder="$t('devTools.editTable.colWidthPlaceholder')"

                @update:model-value="(value: number | undefined) => setColWidth(scope.record, value)"
              />
            </template>
          </a-table-column>
          <a-table-column :title="$t('devTools.editTable.defaultValue')" :width="150">
            <template #cell="scope">
              <a-input
                v-model="scope.record.defaultValue"
                :placeholder="$t('devTools.editTable.defaultValuePlaceholder')"
              />
            </template>
          </a-table-column>

          <a-table-column :title="$t('devTools.editTable.isInsert')" :width="80" align="center">
            <template #title>
              <FieldLabel
                :label="$t('devTools.editTable.isInsert')"
                :tip="$t('devTools.editTable.isInsertTip')"
              />
            </template>
            <template #cell="scope">
              <a-checkbox :model-value="scope.record.isInsert === '1'" @update:model-value="scope.record.isInsert = $event ? '1' : '0'" />
            </template>
          </a-table-column>
          <!--
            #title, not :render-header. The render functions this replaces were
            Vue 2 syntax -- h('el-popover', { props }) with slot: 'reference' --
            which throws under Vue 3, and one throwing header renderer takes the
            whole header row with it: the table rendered with zero <th> and no
            column labels at all.
          -->
          <a-table-column :title="$t('devTools.editTable.isList')" :width="80" align="center">
            <template #title>
              <FieldLabel
                :label="$t('devTools.editTable.isList')"
                :tip="$t('devTools.editTable.isListTip')"
              />
            </template>
            <template #cell="scope">
              <a-checkbox :model-value="scope.record.isList === '1'" @update:model-value="scope.record.isList = $event ? '1' : '0'" />
            </template>
          </a-table-column>
          <a-table-column :title="$t('devTools.editTable.isQuery')" :width="80" align="center">
            <template #title>
              <FieldLabel
                :label="$t('devTools.editTable.isQuery')"
                :tip="$t('devTools.editTable.isQueryTip')"
              />
            </template>
            <template #cell="scope">
              <a-checkbox :model-value="scope.record.isQuery === '1'" @update:model-value="scope.record.isQuery = $event ? '1' : '0'" />
            </template>
          </a-table-column>
          <a-table-column :title="$t('devTools.editTable.queryType')" :width="120">
            <template #cell="scope">
              <a-select v-model="scope.record.queryType">
                <a-option label="=" value="EQ" />
                <a-option label="!=" value="NE" />
                <a-option label=">" value="GT" />
                <a-option label=">=" value="GTE" />
                <a-option label="<" value="LT" />
                <a-option label="<=" value="LTE" />
                <a-option label="LIKE" value="LIKE" />
                <!-- <a-option label="BETWEEN" value="BETWEEN" /> -->
              </a-select>
            </template>
          </a-table-column>
          <a-table-column :title="$t('devTools.editTable.isRequired')" :width="50">
            <template #cell="scope">
              <a-checkbox :model-value="scope.record.isRequired === '1'" @update:model-value="scope.record.isRequired = $event ? '1' : '0'" />
            </template>
          </a-table-column>
          <a-table-column :title="$t('devTools.editTable.htmlType')" :width="140">
            <template #cell="scope">
              <a-select v-model="scope.record.htmlType">
                <a-option :label="$t('devTools.editTable.htmlTypes.input')" value="input" />
                <a-option :label="$t('devTools.editTable.htmlTypes.select')" value="select" />
                <a-option :label="$t('devTools.editTable.htmlTypes.radio')" value="radio" />
                <a-option :label="$t('devTools.editTable.htmlTypes.checkbox')" value="checkbox" />
                <a-option :label="$t('devTools.editTable.htmlTypes.datetime')" value="datetime" />
                <a-option :label="$t('devTools.editTable.htmlTypes.textarea')" value="textarea" />
              </a-select>
            </template>
          </a-table-column>
          <a-table-column :title="$t('devTools.editTable.dictType')" :width="160">
            <template #cell="scope">
              <a-select
                v-model="scope.record.dictType"
                allow-clear
                allow-search
                :placeholder="$t('common.selectPlaceholder')"
              >
                <a-option
                  v-for="dict in dictOptions"
                  :key="dict.dictType"
                  :label="dictTypeName(dict)"
                  :value="dict.dictType"
                >
                  <span style="float: left">{{ dictTypeName(dict) }}</span>
                  <span style="float: right; color: #8492a6; font-size: 13px">{{ dict.dictType }}</span>
                </a-option>
              </a-select>
            </template>
          </a-table-column>
          <a-table-column :title="$t('devTools.editTable.fkTableName')" :width="160">
            <template #cell="scope">
              <a-select
                v-model="scope.record.fkTableName"
                allow-clear
                allow-search
                :placeholder="$t('common.selectPlaceholder')"
                @change="attachForeignColumns(scope.record)"
              >
                <a-option
                  v-for="table in tableTree"
                  :key="table.tableName"
                  :label="table.tableName"
                  :value="table.tableName"
                >
                  <span style="float: left">{{ table.tableName }}</span>
                  <span style="float: right; color: #8492a6; font-size: 13px">{{ table.tableComment }}</span>
                </a-option>
              </a-select>
            </template>
          </a-table-column>
          <a-table-column :title="$t('devTools.editTable.fkLabelId')" :width="150">
            <template #cell="scope">
              <a-select
                v-model="scope.record.fkLabelId"
                allow-clear
                allow-search
                :placeholder="$t('common.selectPlaceholder')"
              >
                <a-option
                  v-for="column in scope.record.fkCol"
                  :key="column.columnName"
                  :label="column.columnName"
                  :value="column.jsonField"
                >
                  <span style="float: left">{{ column.jsonField }}</span>
                  <span style="float: right; color: #8492a6; font-size: 13px">{{ column.columnComment }}</span>
                </a-option>
              </a-select>
            </template>
          </a-table-column>
          <a-table-column :title="$t('devTools.editTable.fkLabelName')" :width="150">
            <template #cell="scope">
              <a-select
                v-model="scope.record.fkLabelName"
                allow-clear
                allow-search
                :placeholder="$t('common.selectPlaceholder')"
              >
                <a-option
                  v-for="column in scope.record.fkCol"
                  :key="column.columnName"
                  :label="column.columnName"
                  :value="column.jsonField"
                >
                  <span style="float: left">{{ column.jsonField }}</span>
                  <span style="float: right; color: #8492a6; font-size: 13px">{{ column.columnComment }}</span>
                </a-option>
              </a-select>
            </template>
          </a-table-column>
        </template></a-table>
      </a-tab-pane>
      <a-tab-pane key="genInfo" :title="$t('devTools.editTable.tabGen')">
        <GenInfoForm ref="genForm" v-model="info" />
      </a-tab-pane>
    </AppTabs>
    <div class="gen-editor-actions">

      <a-button @click="close()">{{ $t('devTools.editTable.back') }}</a-button>
      <a-button type="primary" :loading="saving" @click="submit()">
        {{ $t('devTools.editTable.submit') }}
      </a-button>

    </div>
  </a-card>
</template>
<script setup lang="ts">
import AppTabs from '@/components/AppTabs/index.vue'
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'

import FieldLabel from '@/components/FieldLabel/index.vue'
import BasicInfoForm from './basicInfoForm.vue'
import GenInfoForm from './genInfoForm.vue'
import { translateDictTypeName } from '@/lang/backend'
import { useTagsViewStore } from '@/stores/tagsView'
import { msgSuccess, msgError } from '@/utils/message'

import { getGenTable, updateGenTable, getTableTree } from '@/api/tools/gen'
import { optionselect as getDictOptionselect } from '@/api/admin/dict/type'
import type { GenTable } from '@/api/tools/gen'
import type { SysDictType } from '@/types/admin'

// Must match the menu_name the backend serves, or keep-alive silently misses
defineOptions({ name: 'EditTable' })

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const activeName = ref('cloum')
const columns = ref<GenTable[]>([])
const tableTree = ref<GenTable[]>([])
const dictOptions = ref<SysDictType[]>([])
const saving = ref(false)

/**
 * One record shared with both tabs through v-model, rather than a prop each of
 * them copies. `info` starts as an empty object so the forms have something to
 * bind before the request lands.
 */
const info = ref<GenTable>({})

const basicForm = ref<{ validate: () => Promise<unknown> }>()
const genForm = ref<{ validate: () => Promise<unknown> }>()

/**
 * The dictionary picker's option text.
 *
 * These names come from the database, so they arrive in Chinese whatever the
 * interface language is -- but the seeded ones have a translation keyed by
 * dict_type, which is what lang/backend.ts looks up. A dictionary the operator
 * created has none and falls back to its stored name, which is also what zh-CN
 * always gets: that language ships no dict.ts on purpose.
 */
const dictTypeName = (dict: SysDictType) => translateDictTypeName(dict.dictType, dict.dictName)

/**
 * The relation pickers offer the columns of whichever table a row points at.
 *
 * Empty rather than a placeholder row: the two a-options below bind
 * `:value="column.jsonField"`, which that row does not carry, so it rendered an
 * option whose value was undefined and Element Plus warned on every one of them.
 * a-select shows its own placeholder when it has no options.
 */
const attachForeignColumns = (row: GenTable) => {
  const target = tableTree.value.find(item => item.tableName === row.fkTableName)
  row.fkCol = target?.columns ?? []
}

/**
 * colWidth uses 0 as its "not set" sentinel (PRD 010 R2/G12): the generator
 * falls back to inferring a width from columnType when the column has never
 * been configured. a-input-number only shows its placeholder for
 * undefined/null though, so binding straight to scope.record.colWidth would
 * render a literal, permanent 0 instead of the "leave blank" hint -- these two
 * are the display-layer conversion. The sentinel itself is untouched in
 * `columns`, which is what submit() sends back.
 */
const colWidthModel = (row: GenTable): number | undefined => {
  const value = row.colWidth
  return typeof value === 'number' && value > 0 ? value : undefined
}
const setColWidth = (row: GenTable, value: number | undefined) => {
  row.colWidth = value ?? 0
}

const load = async() => {
  const tableId = Number(route.query.tableId)
  if (!tableId) return
  try {
    const [tree, detail, dicts] = await Promise.all([
      getTableTree(),
      getGenTable(tableId),
      getDictOptionselect()
    ])
    // No placeholder row: a-select already has a placeholder, and this one
    // carried `className` while the option below binds `tableName` -- so every
    // render rejected an undefined `value`. Same shape as the fkCol default
    // above, and the other half of the same fault.
    tableTree.value = tree.data ?? []
    columns.value = detail.data?.list ?? []
    // isDataScope / isActions / isAuth are ints on the backend (1 = yes, 2 = no)
    // and no control edits them, so they round-trip untouched
    info.value = (detail.data?.info ?? {}) as GenTable
    columns.value.forEach(attachForeignColumns)
    dictOptions.value = (dicts.data ?? []) as unknown as SysDictType[]
  } catch {
    // Reported by the interceptor
  }
}

onMounted(load)

const close = () => {
  useTagsViewStore().delView(route)
  return router.push({ path: '/dev-tools/gen', query: { t: String(Date.now()) }})
}

const submit = async() => {
  if (saving.value) return
  const results = await Promise.all([basicForm.value?.validate(), genForm.value?.validate()])
  if (!results.every(Boolean)) {
    msgError(t('devTools.editTable.validationFailed'))
    return
  }

  saving.value = true
  try {
    const payload: GenTable = {
      ...info.value,
      columns: columns.value,
      params: {
        treeCode: info.value.treeCode,
        treeName: info.value.treeName,
        treeParentCode: info.value.treeParentCode
      }
    }
    await updateGenTable(payload)
    msgSuccess(t('devTools.editTable.saveSuccess'))
    await close()
  } catch {
    // Reported by the interceptor
  } finally {
    saving.value = false
  }
}
</script>
