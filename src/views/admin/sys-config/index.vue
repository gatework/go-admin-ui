<template>
  <PageContainer>
    <ProTable
      :table="table"
      selection
      row-key="id"
      :actions-width="120"
    >
      <template #search>
        <a-form-item :label="$t('admin.sysConfig.name')">
          <a-input
            v-model="table.query.configName"
            :placeholder="$t('admin.sysConfig.namePlaceholder')"
            allow-clear
          />
        </a-form-item>
        <a-form-item :label="$t('admin.sysConfig.key')">
          <a-input
            v-model="table.query.configKey"
            :placeholder="$t('admin.sysConfig.keyPlaceholder')"
            allow-clear
          />
        </a-form-item>
        <a-form-item :label="$t('admin.sysConfig.builtIn')">
          <a-select
            v-model="table.query.configType"
            :placeholder="$t('admin.sysConfig.builtInPlaceholder')"
            allow-clear
          >
            <a-option
              v-for="item in sys_yes_no"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </a-select>
        </a-form-item>
      </template>

      <template #toolbar>
        <a-button v-permisaction="['admin:sysConfig:add']" type="primary" @click="form.openCreate()">
          {{ $t('common.add') }}
        </a-button>
        <a-button
          v-permisaction="['admin:sysConfig:edit']"
          :disabled="table.single"
          @click="form.openEdit(table.selection[0])"
        >{{ $t('common.edit') }}</a-button>
        <a-button
          v-permisaction="['admin:sysConfig:remove']"
          status="danger"
          :disabled="table.multiple"
          @click="remove(table.selectedIds)"
        >{{ $t('common.delete') }}</a-button>
        <a-button :loading="exporting" @click="handleExport">{{ $t('common.export') }}</a-button>
      </template>

      <a-table-column :title="$t('admin.sysConfig.configId')" data-index="id" :width="80" :sortable="{ sortDirections: ['ascend', 'descend'] }" />
      <a-table-column
        :title="$t('admin.sysConfig.name')"
        data-index="configName"
        :width="140"
        :sortable="{ sortDirections: ['ascend', 'descend'] }"
        ellipsis
        tooltip
      />
      <a-table-column :title="$t('admin.sysConfig.key')" data-index="configKey" :width="160" :sortable="{ sortDirections: ['ascend', 'descend'] }">
        <template #cell="{ record: row }">
          <a-popover trigger="hover" position="top" :content-style="{ maxWidth: '280px' }"><span class="config-key">{{ row.configKey }}</span><template #content>
            <p class="peek-line">{{ $t('admin.sysConfig.peekValue', { value: row.configValue }) }}</p>
            <p class="peek-line">
              {{ $t('admin.sysConfig.peekFrontend') }}
              <a-tag v-if="row.isFrontend === '1'" color="green">{{ $t('admin.sysConfig.yes') }}</a-tag>
              <a-tag v-else>{{ $t('admin.sysConfig.no') }}</a-tag>
            </p>

          </template></a-popover>
        </template>
      </a-table-column>
      <a-table-column
        :title="$t('admin.sysConfig.builtIn')"
        data-index="configType"
        card-role="badge"
        :width="90"
        :sortable="{ sortDirections: ['ascend', 'descend'] }"
      >
        <template #cell="{ record: row }">{{ dictLabel(sys_yes_no, row.configType) }}</template>
      </a-table-column>
      <a-table-column
        :title="$t('admin.sysConfig.remark')"
        data-index="remark"
        :width="140"
        ellipsis
        tooltip
      />
      <a-table-column :title="$t('common.createdAt')" data-index="createdAt" :width="110" :sortable="{ sortDirections: ['ascend', 'descend'], defaultSortOrder: 'descend' }">
        <template #cell="{ record: row }"><DateCell :value="row.createdAt" /></template>
      </a-table-column>

      <template #actions="{ row }">
        <a-button v-permisaction="['admin:sysConfig:edit']" type="text" @click="form.openEdit(row)">
          {{ $t('common.edit') }}
        </a-button>
        <a-button v-permisaction="['admin:sysConfig:remove']" status="danger" type="text" @click="remove(row.id)">
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
        <!-- Name and key identify the setting that code looks up, so they are
             fixed once created -->
        <a-form-item :label="$t('admin.sysConfig.configName')" field="configName">
          <a-input
            v-model="form.model.configName"
            :placeholder="$t('admin.sysConfig.namePlaceholder')"
            :disabled="form.isEdit"
          />
        </a-form-item>
        <a-form-item :label="$t('admin.sysConfig.configKey')" field="configKey">
          <a-input
            v-model="form.model.configKey"
            :placeholder="$t('admin.sysConfig.keyPlaceholder')"
            :disabled="form.isEdit"
          />
        </a-form-item>
        <a-form-item :label="$t('admin.sysConfig.configValue')" field="configValue">
          <a-input
            v-model="form.model.configValue"
            :placeholder="$t('admin.sysConfig.configValuePlaceholder')"
          />
        </a-form-item>
        <a-form-item :label="$t('admin.sysConfig.configType')" field="configType">
          <a-radio-group v-model="form.model.configType">
            <a-radio
              v-for="item in sys_yes_no"
              :key="item.value"
              :value="item.value"
            >{{ item.label }}</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item :label="$t('admin.sysConfig.isFrontend')" field="isFrontend">
          <a-select
            v-model="form.model.isFrontend"
            :placeholder="$t('admin.sysConfig.isFrontendPlaceholder')"
            style="width: 100%"
          >
            <a-option :label="$t('admin.sysConfig.yes')" value="1" />
            <a-option :label="$t('admin.sysConfig.no')" value="2" />
          </a-select>
        </a-form-item>
        <a-form-item :label="$t('admin.sysConfig.remark')" field="remark">
          <a-textarea
            v-model="form.model.remark"

            :placeholder="$t('admin.sysConfig.remarkPlaceholder')"
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

import { listConfig, getConfig, addConfig, updateConfig, delConfig } from '@/api/admin/sys-config'
import type { SysConfig, SysConfigQuery } from '@/types/admin'

// Must match the menu_name the backend serves, or keep-alive silently misses
defineOptions({ name: 'SysConfigManage' })

const { t } = useI18n()

const { sys_yes_no } = useDict('sys_yes_no')

/** Rows carry `id`, not `configId`, so that is the key throughout. */
type ConfigRow = SysConfig & { id?: number }

const table = useTable<ConfigRow, SysConfigQuery>({
  api: listConfig,
  idKey: 'id',
  defaultSort: { prop: 'createdAt', order: 'descending' },
  defaultQuery: () => ({ configName: undefined, configKey: undefined, configType: undefined })
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
  configName: [{ required: true, message: t('admin.sysConfig.rules.configName') }],
  configKey: [{ required: true, message: t('admin.sysConfig.rules.configKey') }],
  configValue: [{ required: true, message: t('admin.sysConfig.rules.configValue') }],
  isFrontend: [{ required: true, message: t('admin.sysConfig.rules.isFrontend') }]
}))

const form = useForm<ConfigRow, number>({
  defaultModel: () => ({
    id: undefined,
    configName: undefined,
    configKey: undefined,
    configValue: undefined,
    configType: 'Y',
    isFrontend: '1',
    remark: undefined
  }),
  idKey: 'id',
  rules,
  // Computed, not `t(...)` directly: useForm reads the option on every render,
  // so a string resolved here once would pin the dialog to the language the
  // page was opened in.
  title: {
    create: computed(() => t('admin.sysConfig.addTitle')),
    edit: computed(() => t('admin.sysConfig.editTitle'))
  },
  api: { get: getConfig, add: addConfig, update: updateConfig },
  onSuccess: () => table.getList()
})

const { remove } = useRemove({
  api: delConfig,
  onSuccess: () => table.getList()
})

const { exportExcel, exporting } = useExport()

// Built on each click rather than once, so the sheet is written in the
// language the reader is in when they ask for it.
const handleExport = () => exportExcel({
  header: [
    t('admin.sysConfig.exportHeader.configId'),
    t('admin.sysConfig.exportHeader.configName'),
    t('admin.sysConfig.exportHeader.configKey'),
    t('admin.sysConfig.exportHeader.configValue'),
    t('admin.sysConfig.exportHeader.remark'),
    t('admin.sysConfig.exportHeader.createdAt')
  ],
  // `id`, not `configId`: the rows carry the former, so the old export wrote an
  // empty first column on every line
  fields: ['id', 'configName', 'configKey', 'configValue', 'remark', 'createdAt'],
  rows: table.rows as Array<Record<string, unknown>>,
  filename: t('admin.sysConfig.exportFilename')
})
</script>

<style lang="scss" scoped>
.config-key {
  cursor: default;
}
</style>
