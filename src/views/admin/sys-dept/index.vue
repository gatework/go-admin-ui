<template>
  <PageContainer>
    <!--
      paginated: false -- /api/v1/dept answers with the whole tree and this page
      never had a pager. useTable is told the same, so it sends no paging keys.
    -->
    <ProTable
      :table="table"
      :paginated="false"
      row-key="deptId"
      :actions-width="180"
      default-expand-all-rows
      :tree-props="{ children: 'children', hasChildren: 'hasChildren' }"
    >
      <template #search>
        <a-form-item :label="$t('admin.sysDept.deptName')">
          <a-input
            v-model="table.query.deptName"
            :placeholder="$t('admin.sysDept.deptNamePlaceholder')"
            allow-clear
          />
        </a-form-item>
        <a-form-item :label="$t('admin.sysDept.status')">
          <a-select
            v-model="table.query.status"
            :placeholder="$t('admin.sysDept.statusPlaceholder')"
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
        <a-button v-permisaction="['admin:sysDept:add']" type="primary" @click="handleAdd()">
          {{ $t('common.add') }}
        </a-button>
      </template>

      <a-table-column
        data-index="deptName"
        :title="$t('admin.sysDept.deptName')"
        :width="180"
        ellipsis
        tooltip
      />
      <a-table-column data-index="sort" :title="$t('admin.sysDept.sort')" :width="80" />
      <a-table-column data-index="status" :title="$t('admin.sysDept.status')" :width="90">
        <template #cell="{ record: row }">
          <a-tag :color="Number(row.status) === 1 ? 'red' : 'green'">
            {{ dictLabel(sys_normal_disable, row.status) }}
          </a-tag>
        </template>
      </a-table-column>
      <a-table-column :title="$t('common.createdAt')" data-index="createdAt" :width="110">
        <template #cell="{ record: row }"><DateCell :value="row.createdAt" /></template>
      </a-table-column>

      <template #actions="{ row }">
        <a-button
          v-permisaction="['admin:sysDept:edit']"

          type="text"
          @click="handleUpdate(row)"
        >{{ $t('common.edit') }}</a-button>
        <a-button
          v-permisaction="['admin:sysDept:add']"

          type="text"
          @click="handleAdd(row)"
        >{{ $t('common.add') }}</a-button>
        <!-- A root has no parent to fall back to, so it cannot be removed here -->
        <a-button
          v-if="row.parentId !== 0"
          v-permisaction="['admin:sysDept:remove']"
          status="danger"
          type="text"
          @click="handleDelete(row)"
        >{{ $t('common.delete') }}</a-button>
      </template>
    </ProTable>

    <AppModal
      v-model:visible="form.visible"
      :title="form.title"
      width="600px"
      :mask-closable="false"
      @close="form.reset"
    >
      <a-form
        :ref="form.bindFormRef"
        :disabled="form.loading"
        :model="form.model"
        :rules="form.rules"
        layout="vertical"
      >
        <a-row :gutter="16">
          <a-col :span="24">
            <a-form-item :label="$t('admin.sysDept.parent')" field="parentId">
              <!-- Disabled while editing: moving a department between parents is
                   not something this endpoint supports. -->
              <a-tree-select
                v-model="form.model.parentId"
                :data="parent.options"
                :field-names="{ key: 'deptId', title: 'deptName', children: 'children' }"
                :placeholder="$t('admin.sysDept.parentPlaceholder')"
                :disabled="form.isEdit"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item :label="$t('admin.sysDept.deptName')" field="deptName">
              <a-input
                v-model="form.model.deptName"
                :placeholder="$t('admin.sysDept.deptNamePlaceholder')"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item :label="$t('admin.sysDept.displaySort')" field="sort">
              <a-input-number :model-value="form.model.sort === undefined ? undefined : Number(form.model.sort)" :min="0" @update:model-value="form.model.sort = $event" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item :label="$t('admin.sysDept.leader')" field="leader">
              <a-input
                v-model="form.model.leader"
                :placeholder="$t('admin.sysDept.leaderPlaceholder')"
                max-length="20"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item :label="$t('admin.sysDept.phone')" field="phone">
              <a-input
                v-model="form.model.phone"
                :placeholder="$t('admin.sysDept.phonePlaceholder')"
                max-length="11"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item :label="$t('admin.sysDept.email')" field="email">
              <a-input
                v-model="form.model.email"
                :placeholder="$t('admin.sysDept.emailPlaceholder')"
                max-length="50"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item :label="$t('admin.sysDept.deptStatus')" field="status">
              <a-radio-group v-model="form.model.status">
                <a-radio
                  v-for="item in sys_normal_disable"
                  :key="item.value"
                  :value="item.value"
                >{{ item.label }}</a-radio>
              </a-radio-group>
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
      <template #footer>
        <a-button @click="form.close">{{ $t('common.dialogCancel') }}</a-button>
        <a-button type="primary" :loading="form.submitting" @click="form.submit">{{ $t('common.dialogConfirm') }}</a-button>
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
import { useTable, useForm, useRemove, useDict, useTreePicker, dictLabel } from '@/composables'

import { getDeptList, getDeptForForm, addDept, updateDept, delDept } from '@/api/admin/sys-dept'
import type { SysDept, SysDeptQuery } from '@/types/admin'

// Must match the menu_name the backend serves, or keep-alive silently misses
defineOptions({ name: 'SysDeptManage' })

const { t } = useI18n()

const { sys_normal_disable } = useDict('sys_normal_disable')

const table = useTable<SysDept, SysDeptQuery>({
  api: getDeptList,
  idKey: 'deptId',
  paginated: false,
  defaultQuery: () => ({ deptName: undefined, status: undefined })
})

const ROOT_ID = 0

/** The unfiltered tree; see useTreePicker for why it is not `table.rows`. */
const parent = useTreePicker<SysDept>({
  api: () => getDeptList(),
  idKey: 'deptId',
  labelKey: 'deptName',
  rootLabel: computed(() => t('admin.sysDept.rootCategory')),
  rootId: ROOT_ID
})

/**
 * Rebuilt whenever the language changes.
 *
 * A plain object here is evaluated once, when the page is set up, and the page
 * is kept alive -- so a message already rendered under a field, 部门名称不能为空,
 * would keep that language after the reader switched. useForm unwraps the ref,
 * so :rules="form.rules" is unchanged.
 */
const rules = computed<FormRules>(() => ({
  parentId: [{ required: true, message: t('admin.sysDept.rules.parentId') }],
  deptName: [{ required: true, message: t('admin.sysDept.rules.deptName') }],
  sort: [{ required: true, message: t('admin.sysDept.rules.sort') }],
  leader: [{ required: true, message: t('admin.sysDept.rules.leader') }],
  email: [{ type: 'email', message: t('admin.sysDept.rules.emailFormat') }],
  phone: [{ match: /^1[3-9]\d{9}$/, message: t('admin.sysDept.rules.phoneFormat') }]
}))

const form = useForm<SysDept, number>({
  defaultModel: () => ({
    deptId: undefined,
    parentId: undefined,
    deptName: undefined,
    sort: 10,
    leader: undefined,
    phone: undefined,
    email: undefined,
    status: STATUS_NORMAL
  }),
  idKey: 'deptId',
  rules,
  // Computed, not `t(...)` directly: useForm reads the option on every render,
  // so a string resolved here once would pin the dialog to the language the
  // page was opened in.
  title: {
    create: computed(() => t('admin.sysDept.addTitle')),
    edit: computed(() => t('admin.sysDept.editTitle'))
  },
  api: {
    get: getDeptForForm,
    add: addDept,
    update: model => updateDept(model, model.deptId as number)
  },
  onSuccess: () => {
    parent.invalidate()
    return table.getList()
  }
})

/** Adding under a row pre-selects it as the parent. */
const handleAdd = (row?: SysDept) => {
  void parent.ensure()
  form.openCreate(row ? { parentId: row.deptId } : { parentId: ROOT_ID })
}

const handleUpdate = (row: SysDept) => {
  void parent.ensure()
  return form.openEdit(row)
}

const { remove } = useRemove({
  api: delDept,
  confirmText: () => t('admin.sysDept.removeConfirm'),
  onSuccess: () => {
    parent.invalidate()
    return table.getList()
  }
})

const handleDelete = (row: SysDept) => remove(row.deptId)
</script>
