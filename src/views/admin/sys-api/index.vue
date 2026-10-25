<template>
  <PageContainer>
    <ProTable :table="table" row-key="id" :actions-width="80">
      <template #search>
        <a-form-item :label="$t('admin.sysApi.title')">
          <a-input
            v-model="table.query.title"
            :placeholder="$t('admin.sysApi.titlePlaceholder')"
            allow-clear
          />
        </a-form-item>
        <a-form-item :label="$t('admin.sysApi.path')">
          <a-input
            v-model="table.query.path"
            :placeholder="$t('admin.sysApi.pathPlaceholder')"
            allow-clear
          />
        </a-form-item>
        <a-form-item label="Method">
          <a-select
            v-model="table.query.action"
            :placeholder="$t('common.selectPlaceholder')"
            allow-clear
          >
            <a-option v-for="method in METHODS" :key="method" :value="method" :label="method" />
          </a-select>
        </a-form-item>
        <a-form-item :label="$t('admin.sysApi.type')">
          <a-select
            v-model="table.query.type"
            :placeholder="$t('common.selectPlaceholder')"
            allow-clear
          >
            <a-option value="SYS" label="SYS" />
            <a-option value="BUS" label="BUS" />
          </a-select>
        </a-form-item>
      </template>

      <a-table-column
        :title="$t('admin.sysApi.title')"
        data-index="title"
        :width="240"
        :sortable="{ sortDirections: ['ascend', 'descend'] }"
        ellipsis
        tooltip
      >
        <template #cell="{ record: row }">
          <!-- SYS routes are infrastructure and cannot be granted to a role,
               which is the distinction the colour carries. -->
          <a-tag v-if="!row.title" color="red">{{ $t('admin.sysApi.none') }}</a-tag>
          <a-tag v-else :color="row.type === 'SYS' ? 'green' : 'gray'">
            [{{ row.type }}] {{ row.title }}
          </a-tag>
        </template>
      </a-table-column>

      <a-table-column
        :title="$t('admin.sysApi.api')"
        data-index="path"
        :width="280"
        :sortable="{ sortDirections: ['ascend', 'descend'] }"
        ellipsis
        tooltip
      >
        <template #cell="{ record: row }">
          <a-popover trigger="hover" position="top" :content-style="{ maxWidth: '360px' }">
            <span><MethodTag :method="row.action" /> {{ row.path }}</span>
            <template #content>
              <p class="peek-line">{{ $t('admin.sysApi.peekHandle', { value: row.handle || '-' }) }}</p>
              <p class="peek-line">{{ $t('admin.sysApi.peekType', { value: row.type || '-' }) }}</p>
              <p class="peek-line">
                {{ $t('admin.sysApi.peekTitle', { value: row.title || $t('admin.sysApi.none') }) }}
              </p>

            </template></a-popover>
        </template>
      </a-table-column>

      <a-table-column :title="$t('common.createdAt')" data-index="createdAt" :width="120" :sortable="{ sortDirections: ['ascend', 'descend'] }">
        <template #cell="{ record: row }"><DateCell :value="row.createdAt" /></template>
      </a-table-column>

      <template #actions="{ row }">
        <a-button v-permisaction="['admin:sysApi:edit']" type="text" @click="form.openEdit(row)">
          {{ $t('common.edit') }}
        </a-button>
      </template>
    </ProTable>

    <!--
      A drawer rather than a dialog: this form sits beside the row it edits, and
      the page is scanned route by route. Kept from the version this replaces.
    -->
    <AppDrawer v-model:visible="form.visible" :title="form.title" placement="right" :width="420">
      <a-form :ref="form.bindFormRef" :model="form.model" :rules="form.rules" layout="vertical">
        <a-form-item label="Handle" field="handle">
          <a-input v-model="form.model.handle" placeholder="handle" />
        </a-form-item>
        <a-form-item :label="$t('admin.sysApi.title')" field="title">
          <a-input v-model="form.model.title" :placeholder="$t('admin.sysApi.title')" />
        </a-form-item>
        <a-form-item :label="$t('admin.sysApi.type')" field="type">
          <a-select
            v-model="form.model.type"
            :placeholder="$t('admin.sysApi.typePlaceholder')"
            style="width: 100%"
          >
            <a-option value="SYS" label="SYS" />
            <a-option value="BUS" label="BUS" />
          </a-select>
        </a-form-item>
        <a-form-item label="Method" field="action">
          <a-select
            v-model="form.model.action"
            :placeholder="$t('admin.sysApi.actionPlaceholder')"
            style="width: 100%"
          >
            <a-option v-for="method in METHODS" :key="method" :value="method" :label="method" />
          </a-select>
        </a-form-item>
        <a-form-item :label="$t('admin.sysApi.path')" field="path">
          <!-- The path identifies the route; the backend registers it, so it is
               shown for confirmation rather than offered for editing. -->
          <a-input v-model="form.model.path" disabled :placeholder="$t('admin.sysApi.path')" />
        </a-form-item>
      </a-form>
      <template #footer>
        <a-button @click="form.close()">{{ $t('common.dialogCancel') }}</a-button>
        <a-button type="primary" :loading="form.submitting" @click="form.submit()">
          {{ $t('common.dialogConfirm') }}
        </a-button>
      </template>
    </AppDrawer>
  </PageContainer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { FormRules } from '@/types/ui'

import AppDrawer from '@/components/AppDrawer/index.vue'
import PageContainer from '@/components/PageContainer/index.vue'
import ProTable from '@/components/ProTable/index.vue'
import DateCell from '@/components/DateCell/index.vue'
import MethodTag from '@/components/MethodTag/index.vue'
import { useTable, useForm } from '@/composables'

import { listSysApi, getSysApi, updateSysApi } from '@/api/admin/sys-api'
import type { SysApi, SysApiQuery } from '@/types/admin'

// Must match the menu_name the backend serves, or keep-alive silently misses
defineOptions({ name: 'SysApiManage' })

const { t } = useI18n()

const METHODS = ['GET', 'POST', 'PUT', 'DELETE']

/**
 * Routes are registered by the Go side, so this page edits them and nothing
 * else: no create, no delete. The version it replaces carried handleAdd,
 * handleDelete and selection tracking that no button in the template reached.
 */
const table = useTable<SysApi, SysApiQuery>({
  api: listSysApi,
  idKey: 'id',
  defaultQuery: () => ({ title: undefined, path: undefined, action: undefined, type: undefined })
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
  handle: [{ required: true, message: t('admin.sysApi.rules.handle') }],
  title: [{ required: true, message: t('admin.sysApi.rules.title') }],
  type: [{ required: true, message: t('admin.sysApi.rules.type') }]
}))

const form = useForm<SysApi, number>({
  defaultModel: () => ({
    id: undefined,
    handle: undefined,
    title: undefined,
    type: 'BUS',
    action: undefined,
    path: undefined
  }),
  idKey: 'id',
  rules,
  // Computed, not `t(...)` directly: useForm reads the option on every render,
  // so a string resolved here once would pin the drawer to the language the
  // page was opened in.
  // Only `edit`: the API list is populated by the backend registering its own
  // routes, so this page has no create path -- no button, no openCreate call,
  // and `api` below has no `add`. A create title here could never render.
  title: {
    edit: computed(() => t('admin.sysApi.editTitle'))
  },
  api: { get: getSysApi, update: updateSysApi },
  onSuccess: () => table.getList()
})
</script>
