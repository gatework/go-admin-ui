<template>
  <PageContainer>
    <ProTable :table="table" selection row-key="postId" :actions-width="120">
      <template #search>
        <a-form-item :label="$t('admin.sysPost.postCode')">
          <a-input
            v-model="table.query.postCode"
            :placeholder="$t('admin.sysPost.postCodePlaceholder')"
            allow-clear
          />
        </a-form-item>
        <a-form-item :label="$t('admin.sysPost.postName')">
          <a-input
            v-model="table.query.postName"
            :placeholder="$t('admin.sysPost.postNamePlaceholder')"
            allow-clear
          />
        </a-form-item>
        <a-form-item :label="$t('admin.sysPost.status')">
          <a-select
            v-model="table.query.status"
            :placeholder="$t('admin.sysPost.statusPlaceholder')"
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
        <a-button v-permisaction="['admin:sysPost:add']" type="primary" @click="form.openCreate()">
          {{ $t('common.add') }}
        </a-button>
        <a-button
          v-permisaction="['admin:sysPost:edit']"
          :disabled="table.single"
          @click="form.openEdit(table.selection[0])"
        >{{ $t('common.edit') }}</a-button>
        <a-button
          v-permisaction="['admin:sysPost:remove']"
          status="danger"
          :disabled="table.multiple"
          @click="remove(table.selectedIds)"
        >{{ $t('common.delete') }}</a-button>
        <a-button
          v-permisaction="['admin:sysPost:export']"
          :loading="exporting"
          @click="handleExport"
        >{{ $t('common.export') }}</a-button>
      </template>

      <a-table-column :title="$t('admin.sysPost.postId')" data-index="postId" :width="90" />
      <a-table-column
        :title="$t('admin.sysPost.postCode')"
        data-index="postCode"
        :width="120"
        ellipsis
        tooltip
      />
      <a-table-column
        :title="$t('admin.sysPost.postName')"
        data-index="postName"
        :width="120"
        ellipsis
        tooltip
      />
      <a-table-column :title="$t('admin.sysPost.postSort')" data-index="sort" :width="90" />
      <a-table-column :title="$t('admin.sysPost.status')" data-index="status" :width="90">
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
        <a-button v-permisaction="['admin:sysPost:edit']" type="text" @click="form.openEdit(row)">
          {{ $t('common.edit') }}
        </a-button>
        <a-button v-permisaction="['admin:sysPost:remove']" status="danger" type="text" @click="remove(row.postId)">
          {{ $t('common.delete') }}
        </a-button>
      </template>
    </ProTable>

    <AppModal
      v-model:visible="form.visible"
      :title="form.title"
      width="500px"
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
        <a-form-item :label="$t('admin.sysPost.postName')" field="postName">
          <a-input v-model="form.model.postName" :placeholder="$t('admin.sysPost.postNamePlaceholder')" />
        </a-form-item>
        <a-form-item :label="$t('admin.sysPost.postCode')" field="postCode">
          <a-input v-model="form.model.postCode" :placeholder="$t('admin.sysPost.codeNamePlaceholder')" />
        </a-form-item>
        <a-form-item :label="$t('admin.sysPost.sort')" field="sort">
          <a-input-number v-model="form.model.sort" :min="0" />
        </a-form-item>
        <a-form-item :label="$t('admin.sysPost.postStatus')" field="status">
          <a-radio-group v-model="form.model.status">
            <a-radio
              v-for="item in sys_normal_disable"
              :key="item.value"
              :value="item.value"
            >{{ item.label }}</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item :label="$t('admin.sysPost.remark')" field="remark">
          <a-textarea
            v-model="form.model.remark"

            :placeholder="$t('admin.sysPost.remarkPlaceholder')"
          />
        </a-form-item>
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
import { useTable, useForm, useRemove, useDict, useExport, dictLabel } from '@/composables'

import { listPost, getPostForForm, addPost, updatePost, delPost } from '@/api/admin/sys-post'
import { STATUS_NORMAL } from '@/api/status'
import type { SysPost, SysPostQuery } from '@/types/admin'

// Must match the menu_name the backend serves, or keep-alive silently misses
defineOptions({ name: 'SysPostManage' })

const { t } = useI18n()

const { sys_normal_disable } = useDict('sys_normal_disable')

const table = useTable<SysPost, SysPostQuery>({
  api: listPost,
  idKey: 'postId',
  defaultQuery: () => ({ postCode: undefined, postName: undefined, status: undefined })
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
  postName: [{ required: true, message: t('admin.sysPost.rules.postName') }],
  postCode: [{ required: true, message: t('admin.sysPost.rules.postCode') }],
  sort: [{ required: true, message: t('admin.sysPost.rules.sort') }]
}))

const form = useForm<SysPost, number>({
  defaultModel: () => ({
    postId: undefined,
    postCode: undefined,
    postName: undefined,
    sort: 0,
    status: STATUS_NORMAL,
    remark: undefined
  }),
  idKey: 'postId',
  rules,
  // Computed, not `t(...)` directly: useForm reads the option on every render,
  // so a string resolved here once would pin the dialog to the language the
  // page was opened in.
  title: {
    create: computed(() => t('admin.sysPost.addTitle')),
    edit: computed(() => t('admin.sysPost.editTitle'))
  },
  api: {
    get: getPostForForm,
    add: addPost,
    update: model => updatePost(model, model.postId as number)
  },
  onSuccess: () => table.getList()
})

const { remove } = useRemove({
  api: delPost,
  onSuccess: () => table.getList()
})

const { exportExcel, exporting } = useExport()

// Built on each click rather than once, so the sheet is written in the
// language the reader is in when they ask for it.
const handleExport = () => exportExcel({
  header: [
    t('admin.sysPost.exportHeader.postId'),
    t('admin.sysPost.exportHeader.postCode'),
    t('admin.sysPost.exportHeader.postName'),
    t('admin.sysPost.exportHeader.sort'),
    t('admin.sysPost.exportHeader.createdAt')
  ],
  fields: ['postId', 'postCode', 'postName', 'sort', 'createdAt'],
  rows: table.rows as Array<Record<string, unknown>>,
  filename: t('admin.sysPost.exportFilename')
})
</script>
