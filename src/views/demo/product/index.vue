<template>
  <PageContainer>
    <ProTable :table="table" selection row-key="id">
      <!-- Search fields. No prop attributes needed: resetQuery rebuilds the
           query from its factory rather than asking a-form to reset itself -->
      <template #search>
        <a-form-item :label="$t('demo.name')">
          <a-input v-model="table.query.name" :placeholder="$t('demo.namePlaceholder')" allow-clear />
        </a-form-item>
        <a-form-item :label="$t('demo.status')">
          <a-select v-model="table.query.status" :placeholder="$t('demo.statusPlaceholder')" allow-clear>
            <a-option :label="$t('demo.normal')" value="1" />
            <a-option :label="$t('demo.disabled')" value="2" />
          </a-select>
        </a-form-item>
      </template>

      <!-- Permission codes are 模块:资源:操作 and must match sys_menu -->
      <template #toolbar>
        <a-button v-permisaction="['demo:product:add']" type="primary" @click="form.openCreate()">
          {{ $t('common.add') }}
        </a-button>
        <!-- Plain while it needs a selection; see AGENTS.md -->
        <a-button
          v-permisaction="['demo:product:delete']"
          status="danger"
          :disabled="table.multiple"
          @click="remove(table.selectedIds)"
        >
          {{ $t('common.delete') }}
        </a-button>
      </template>

      <!-- min-width, not width: see AGENTS.md -->
      <a-table-column :title="$t('demo.name')" data-index="name" :width="120" ellipsis tooltip />
      <a-table-column :title="$t('demo.code')" data-index="code" :width="100" />
      <a-table-column :title="$t('demo.price')" data-index="price" :width="90" align="right" />
      <a-table-column :title="$t('demo.status')" data-index="status" :width="90">
        <template #cell="{ record: row }">
          <a-tag :color="row.status === '1' ? 'green' : 'gray'">
            {{ row.status === '1' ? $t('demo.normal') : $t('demo.disabled') }}
          </a-tag>
        </template>
      </a-table-column>
      <a-table-column :title="$t('common.createdAt')" :width="110">
        <template #cell="{ record: row }"><DateCell :value="row.createdAt" /></template>
      </a-table-column>
      <template #actions="{ row }">
        <a-button v-permisaction="['demo:product:edit']" type="text" @click="form.openEdit(row)">
          {{ $t('common.edit') }}
        </a-button>
        <a-button v-permisaction="['demo:product:delete']" type="text" status="danger" @click="remove(row.id)">
          {{ $t('common.delete') }}
        </a-button>
      </template>
    </ProTable>

    <!-- One dialog for both modes; useForm tells them apart by the primary key -->
    <AppModal
      v-model:visible="form.visible"
      :title="form.title"
      width="500px"
      :mask-closable="false"
      @close="form.reset"
    >
      <a-form
        :ref="form.bindFormRef"
        :model="form.model"
        :rules="form.rules"
        layout="vertical"
        :disabled="form.loading"
      >
        <a-form-item :label="$t('demo.name')" field="name">
          <a-input v-model="form.model.name" :placeholder="$t('demo.namePlaceholder')" />
        </a-form-item>
        <a-form-item :label="$t('demo.code')" field="code">
          <a-input v-model="form.model.code" :placeholder="$t('demo.codePlaceholder')" />
        </a-form-item>
        <a-form-item :label="$t('demo.price')" field="price">
          <a-input-number v-model="form.model.price" :min="0" :precision="2" />
        </a-form-item>
        <a-form-item :label="$t('demo.status')" field="status">
          <a-radio-group v-model="form.model.status">
            <a-radio value="1">{{ $t('demo.normal') }}</a-radio>
            <a-radio value="2">{{ $t('demo.disabled') }}</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item :label="$t('demo.remark')" field="remark">
          <a-textarea v-model="form.model.remark" :placeholder="$t('demo.remarkPlaceholder')" />
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
/**
 * Reference list page. Copy this shape for new pages.
 *
 * Everything that used to be repeated per page -- paging, search, reset,
 * selection, the create/edit dialog, the delete confirmation -- comes from
 * useTable and useForm. What is left is what actually differs: which endpoints,
 * which columns, which fields, which rules.
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { FormRules } from '@/types/ui'

import AppModal from '@/components/AppModal/index.vue'
import PageContainer from '@/components/PageContainer/index.vue'
import ProTable from '@/components/ProTable/index.vue'
import DateCell from '@/components/DateCell/index.vue'
import { useTable, useForm, useRemove } from '@/composables'

import {
  listProduct, getProduct, addProduct, updateProduct, delProduct
} from '@/api/demo/product'
import type { Product, ProductQuery } from '@/api/demo/product'

// Must match the menu_name the backend serves, or keep-alive silently misses
defineOptions({ name: 'DemoProduct' })

const table = useTable<Product, ProductQuery>({
  api: listProduct,
  idKey: 'id',
  defaultQuery: () => ({ name: undefined, status: undefined })
})

const { t } = useI18n()

// Computed, not a constant: module scope is evaluated once, so messages built
// from t() there would keep the language the module loaded in -- including one
// already displayed under a field. useForm accepts a MaybeRef.
const rules = computed<FormRules>(() => ({
  name: [{ required: true, message: t('demo.rules.name') }],
  code: [{ required: true, message: t('demo.rules.code') }]
}))

const form = useForm<Product, number>({
  defaultModel: () => ({
    id: undefined,
    name: undefined,
    code: undefined,
    price: 0,
    status: '1',
    remark: undefined
  }),
  idKey: 'id',
  rules,
  api: { get: getProduct, add: addProduct, update: updateProduct },
  onSuccess: () => table.getList()
})

const { remove } = useRemove({
  api: delProduct,
  onSuccess: () => table.getList()
})
</script>
