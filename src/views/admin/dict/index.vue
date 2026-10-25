<template>
  <PageContainer>
    <ProTable :table="table" selection row-key="id" :actions-width="120">
      <template #search>
        <a-form-item :label="$t('admin.dict.type.dictName')">
          <a-input
            v-model="table.query.dictName"
            :placeholder="$t('admin.dict.type.dictNamePlaceholder')"
            allow-clear
          />
        </a-form-item>
        <a-form-item :label="$t('admin.dict.type.dictType')">
          <a-input
            v-model="table.query.dictType"
            :placeholder="$t('admin.dict.type.dictTypePlaceholder')"
            allow-clear
          />
        </a-form-item>
        <a-form-item :label="$t('admin.dict.type.status')">
          <a-select
            v-model="table.query.status"
            :placeholder="$t('admin.dict.type.statusPlaceholder')"
            allow-clear
          >
            <a-option
              v-for="item in sys_normal_disable"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </a-select>
        </a-form-item>
      </template>

      <template #toolbar>
        <a-button v-permisaction="['admin:sysDictType:add']" type="primary" @click="form.openCreate()">
          {{ $t('common.add') }}
        </a-button>
        <a-button
          v-permisaction="['admin:sysDictType:remove']"
          status="danger"
          :disabled="table.multiple"
          @click="remove(table.selectedIds)"
        >{{ $t('common.delete') }}</a-button>
        <a-button v-permisaction="['admin:sysDictType:export']" :loading="exporting" @click="handleExport">
          {{ $t('common.export') }}
        </a-button>
      </template>

      <a-table-column :title="$t('admin.dict.type.dictId')" data-index="id" :width="80" />
      <a-table-column
        :title="$t('admin.dict.type.dictName')"
        data-index="dictName"
        :width="140"
        ellipsis
        tooltip
      />
      <a-table-column
        :title="$t('admin.dict.type.dictType')"
        data-index="dictType"
        :width="160"
        ellipsis
        tooltip
      >
        <template #cell="{ record: row }">
          <!-- The entries live on their own page, keyed by this record's id -->
          <router-link :to="{ name: 'SysDictDataManage', params: { dictId: row.id }}" class="link-type">
            {{ row.dictType }}
          </router-link>
        </template>
      </a-table-column>
      <a-table-column :title="$t('admin.dict.type.status')" data-index="status" :width="90">
        <template #cell="{ record: row }">
          <a-tag :color="Number(row.status) === 2 ? 'green' : 'red'">
            {{ dictLabel(sys_normal_disable, row.status) }}
          </a-tag>
        </template>
      </a-table-column>
      <a-table-column
        :title="$t('admin.dict.type.remark')"
        data-index="remark"
        :width="160"
        ellipsis
        tooltip
      />
      <!--
        Not sortable: SysDictTypeOrder binds dictIdOrder and nothing else, so a
        header on this column would send createdAtOrder, which gin drops.
      -->
      <a-table-column :title="$t('common.createdAt')" data-index="createdAt" :width="110">
        <template #cell="{ record: row }"><DateCell :value="row.createdAt" /></template>
      </a-table-column>

      <template #actions="{ row }">
        <a-button v-permisaction="['admin:sysDictType:edit']" type="text" @click="form.openEdit(row)">
          {{ $t('common.edit') }}
        </a-button>
        <a-button v-permisaction="['admin:sysDictType:remove']" status="danger" type="text" @click="remove(row.id)">
          {{ $t('common.delete') }}
        </a-button>
      </template>
    </ProTable>

    <AppModal v-model:visible="form.visible" :title="form.title" width="500px" :mask-closable="false">
      <a-form :ref="form.bindFormRef" :model="form.model" :rules="form.rules" layout="vertical">
        <a-form-item :label="$t('admin.dict.type.dictName')" field="dictName">
          <a-input
            v-model="form.model.dictName"
            :placeholder="$t('admin.dict.type.dictNamePlaceholder')"
            :disabled="form.isEdit"
          />
        </a-form-item>
        <a-form-item :label="$t('admin.dict.type.dictType')" field="dictType">
          <a-input
            v-model="form.model.dictType"
            :placeholder="$t('admin.dict.type.dictTypePlaceholder')"
            :disabled="form.isEdit"
          />
        </a-form-item>
        <a-form-item :label="$t('admin.dict.type.status')" field="status">
          <a-radio-group v-model="form.model.status">
            <a-radio v-for="item in sys_normal_disable" :key="item.value" :value="item.value">
              {{ item.label }}
            </a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item :label="$t('admin.dict.type.remark')" field="remark">
          <a-textarea
            v-model="form.model.remark"

            :placeholder="$t('admin.dict.type.remarkPlaceholder')"
          />
        </a-form-item>
      </a-form>
      <template #footer>
        <a-button @click="form.close()">{{ $t('common.dialogCancel') }}</a-button>
        <a-button type="primary" :loading="form.submitting" @click="form.submit()">
          {{ $t('common.dialogConfirm') }}
        </a-button>
      </template>
    </AppModal>
  </PageContainer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { FormRules } from '@/types/ui'

import AppModal from '@/components/AppModal/index.vue'
import PageContainer from '@/components/PageContainer/index.vue'
import ProTable from '@/components/ProTable/index.vue'
import DateCell from '@/components/DateCell/index.vue'
import { STATUS_NORMAL } from '@/api/status'
import { useTable, useForm, useRemove, useDict, useExport, dictLabel } from '@/composables'

import { listType, getTypeForForm, addType, updateType, delType } from '@/api/admin/dict/type'
import type { SysDictType, SysDictTypeQuery } from '@/types/admin'

// Must match the menu_name the backend serves, or keep-alive silently misses
defineOptions({ name: 'Dict' })

const { t } = useI18n()

const { sys_normal_disable } = useDict('sys_normal_disable')

const table = useTable<SysDictType, SysDictTypeQuery>({
  api: listType,
  idKey: 'id',
  defaultQuery: () => ({ dictName: undefined, dictType: undefined, status: undefined })
})

/**
 * Rebuilt whenever the language changes.
 *
 * A plain object here is evaluated once, when the page is set up, and the page
 * is kept alive -- so a message already rendered under a field would keep the
 * language it was built in. useForm unwraps the ref, so :rules="form.rules" is
 * unchanged.
 */
const rules = computed<FormRules>(() => ({
  dictName: [{ required: true, message: t('admin.dict.type.rules.dictName') }],
  dictType: [{ required: true, message: t('admin.dict.type.rules.dictType') }]
}))

const form = useForm<SysDictType, number>({
  defaultModel: () => ({
    id: undefined,
    dictName: undefined,
    dictType: undefined,
    status: STATUS_NORMAL,
    remark: undefined
  }),
  idKey: 'id',
  rules,
  // Computed, not `t(...)` directly: useForm reads the option on every render,
  // so a string resolved here once would pin the dialog to the language the
  // page was opened in.
  title: {
    create: computed(() => t('admin.dict.type.addTitle')),
    edit: computed(() => t('admin.dict.type.editTitle'))
  },
  api: { get: getTypeForForm, add: addType, update: updateType },
  onSuccess: () => table.getList()
})

const { remove } = useRemove({
  api: delType,
  // The count is both a named value and the plural choice: Chinese needs one
  // form, English needs two, and passing it twice lets each pack decide.
  confirmText: count => t('admin.dict.type.removeConfirm', { count }, count),
  onSuccess: () => table.getList()
})

const { exportExcel, exporting } = useExport()

// Built on each click rather than once, so the sheet is written in the
// language the reader is in when they ask for it.
const handleExport = () => exportExcel({
  header: [
    t('admin.dict.type.exportHeader.dictId'),
    t('admin.dict.type.exportHeader.dictName'),
    t('admin.dict.type.exportHeader.dictType'),
    t('admin.dict.type.exportHeader.status'),
    t('admin.dict.type.exportHeader.remark')
  ],
  fields: ['id', 'dictName', 'dictType', 'status', 'remark'],
  rows: table.rows as Array<Record<string, unknown>>,
  filename: t('admin.dict.type.exportFilename')
})
</script>
