<template>
  <PageContainer>
    <ProTable :table="table" selection row-key="roleId" :actions-width="180">
      <template #search>
        <a-form-item :label="$t('admin.sysRole.roleName')">
          <a-input
            v-model="table.query.roleName"
            :placeholder="$t('admin.sysRole.roleNamePlaceholder')"
            allow-clear
          />
        </a-form-item>
        <a-form-item :label="$t('admin.sysRole.roleKey')">
          <a-input
            v-model="table.query.roleKey"
            :placeholder="$t('admin.sysRole.roleKeyPlaceholder')"
            allow-clear
          />
        </a-form-item>
        <a-form-item :label="$t('admin.sysRole.status')">
          <a-select
            v-model="table.query.status"
            :placeholder="$t('admin.sysRole.statusPlaceholder')"
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
        <a-button v-permisaction="['admin:sysRole:add']" type="primary" @click="handleAdd">{{ $t('common.add') }}</a-button>
        <a-button
          v-permisaction="['admin:sysRole:edit']"
          :disabled="table.single"
          @click="handleEdit(table.selection[0])"
        >{{ $t('common.edit') }}</a-button>
        <a-button
          v-permisaction="['admin:sysRole:remove']"
          status="danger"
          :disabled="table.multiple"
          @click="remove(table.selectedIds)"
        >{{ $t('common.delete') }}</a-button>
        <a-button :loading="exporting" @click="handleExport">{{ $t('common.export') }}</a-button>
      </template>

      <a-table-column :title="$t('admin.sysRole.roleId')" data-index="roleId" :width="80" :sortable="{ sortDirections: ['ascend', 'descend'] }" />
      <a-table-column
        :title="$t('admin.sysRole.name')"
        data-index="roleName"
        :width="120"
        :sortable="{ sortDirections: ['ascend', 'descend'] }"
        ellipsis
        tooltip
      />
      <a-table-column
        :title="$t('admin.sysRole.roleKey')"
        data-index="roleKey"
        :width="120"
        ellipsis
        tooltip
      />
      <a-table-column :title="$t('admin.sysRole.sort')" data-index="roleSort" :width="80" :sortable="{ sortDirections: ['ascend', 'descend'] }" />
      <a-table-column :title="$t('admin.sysRole.status')" data-index="status" :width="96" :sortable="{ sortDirections: ['ascend', 'descend'] }">
        <template #cell="{ record: row }">
          <a-switch
            v-model="row.status"
            checked-value="2"
            unchecked-value="1"
            @change="handleStatusChange(row)"
          />
        </template>
      </a-table-column>
      <a-table-column :title="$t('common.createdAt')" data-index="createdAt" :width="110" :sortable="{ sortDirections: ['ascend', 'descend'] }">
        <template #cell="{ record: row }"><DateCell :value="row.createdAt" /></template>
      </a-table-column>

      <template #actions="{ row }">
        <a-button v-permisaction="['admin:sysRole:edit']" type="text" @click="handleEdit(row)">
          {{ $t('common.edit') }}
        </a-button>
        <a-button v-permisaction="['admin:sysRole:update']" type="text" @click="handleDataScope(row)">
          {{ $t('admin.sysRole.dataScope') }}
        </a-button>
        <a-button v-permisaction="['admin:sysRole:remove']" status="danger" type="text" @click="remove(row.roleId)">
          {{ $t('common.delete') }}
        </a-button>
      </template>
    </ProTable>

    <!-- Create / edit, with the menu tree -->
    <AppModal
      v-model:visible="roleForm.visible"
      :title="roleForm.title"
      width="560px"
      :mask-closable="false"
      @close="roleForm.reset"
    >
      <a-form
        :ref="roleForm.bindFormRef"
        :disabled="roleForm.loading"
        :model="roleForm.model"
        :rules="roleForm.rules"
        layout="vertical"
      >
        <a-form-item :label="$t('admin.sysRole.roleName')" field="roleName">
          <a-input
            v-model="roleForm.model.roleName"
            :placeholder="$t('admin.sysRole.roleNamePlaceholder')"
            :disabled="roleForm.isEdit"
          />
        </a-form-item>
        <a-form-item :label="$t('admin.sysRole.roleKey')" field="roleKey">
          <a-input
            v-model="roleForm.model.roleKey"
            :placeholder="$t('admin.sysRole.roleKeyPlaceholder')"
            :disabled="roleForm.isEdit"
          />
        </a-form-item>
        <a-form-item :label="$t('admin.sysRole.roleSort')" field="roleSort">
          <a-input-number v-model="roleForm.model.roleSort" :min="0" />
        </a-form-item>
        <a-form-item :label="$t('admin.sysRole.status')" field="status">
          <a-radio-group v-model="roleForm.model.status">
            <a-radio
              v-for="item in sys_normal_disable"
              :key="item.value"
              :value="item.value"
            >{{ item.label }}</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item :label="$t('admin.sysRole.menuPermission')">
          <a-empty v-if="superAdminOnly || !menuOptions.length" :description="menuEmptyText" />
          <a-tree
            v-else
            v-model:checked-keys="menuChecked"
            :data="superAdminOnly ? [] : menuOptions"
            checkable
            checked-strategy="all"
            :field-names="{ key: 'id', title: 'label', children: 'children' }"
            class="permission-tree"
          ><template #empty>{{ menuEmptyText }}</template></a-tree>
        </a-form-item>
        <a-form-item :label="$t('admin.sysRole.remark')" field="remark">
          <a-textarea
            v-model="roleForm.model.remark"

            :placeholder="$t('admin.sysRole.remarkPlaceholder')"
          />
        </a-form-item>
      </a-form>
      <template #footer>
        <a-button @click="roleForm.close">{{ $t('common.dialogCancel') }}</a-button>
        <a-button type="primary" :loading="roleForm.submitting" @click="roleForm.submit">{{ $t('common.dialogConfirm') }}</a-button>
      </template>
    </AppModal>

    <!--
      Data scope, with the department tree. Its own useForm, so it has its own
      visibility, model and in-flight state: the previous version gated this
      dialog on one flag while binding its visibility to the other form's, so it
      never appeared at all.
    -->
    <AppModal
      v-model:visible="scopeForm.visible"
      :title="$t('admin.sysRole.dataScopeTitle')"
      width="560px"
      :mask-closable="false"
      @close="scopeForm.reset"
    >
      <a-form
        :ref="scopeForm.bindFormRef"
        :disabled="scopeForm.loading"
        :model="scopeForm.model"
        layout="vertical"
      >
        <a-form-item :label="$t('admin.sysRole.roleName')">
          <a-input :model-value="scopeForm.model.roleName" disabled />
        </a-form-item>
        <a-form-item :label="$t('admin.sysRole.roleKey')">
          <a-input :model-value="scopeForm.model.roleKey" disabled />
        </a-form-item>
        <a-form-item :label="$t('admin.sysRole.scope')">
          <a-select v-model="scopeForm.model.dataScope" style="width: 100%">
            <a-option
              v-for="item in dataScopes"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </a-select>
        </a-form-item>
        <a-form-item v-show="scopeForm.model.dataScope === CUSTOM_SCOPE" :label="$t('admin.sysRole.dataScope')">
          <a-tree
            v-model:checked-keys="deptChecked"
            :data="deptOptions"
            checkable
            checked-strategy="all"
            default-expand-all
            :field-names="{ key: 'id', title: 'label', children: 'children' }"
            class="permission-tree"
          ><template #empty>{{ $t('admin.sysRole.treeLoading') }}</template></a-tree>
        </a-form-item>
      </a-form>
      <template #footer>
        <a-button @click="scopeForm.close">{{ $t('common.dialogCancel') }}</a-button>
        <a-button type="primary" :loading="scopeForm.submitting" @click="scopeForm.submit">{{ $t('common.dialogConfirm') }}</a-button>
      </template>
    </AppModal>
  </PageContainer>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { confirmAction } from '@/utils/modal'
import type { FormRules } from '@/types/ui'

import AppModal from '@/components/AppModal/index.vue'
import PageContainer from '@/components/PageContainer/index.vue'
import ProTable from '@/components/ProTable/index.vue'
import DateCell from '@/components/DateCell/index.vue'
import { STATUS_NORMAL } from '@/api/status'
import { useTable, useForm, useRemove, useDict, useExport, dictLabel } from '@/composables'
import { msgSuccess } from '@/utils/message'

import {
  listRole, getRole, addRole, updateRole, delRole, dataScope, changeRoleStatus
} from '@/api/admin/sys-role'
import { roleMenuTreeselect } from '@/api/admin/sys-menu'
import { roleDeptTreeselect } from '@/api/admin/sys-dept'
import type { DeptTreeNode, SysRole, SysRoleQuery } from '@/types/admin'

// Must match the menu_name the backend serves, or keep-alive silently misses
defineOptions({ name: 'SysRoleManage' })

const { t } = useI18n()

const { sys_normal_disable } = useDict('sys_normal_disable')

/** Only 自定 needs the department tree; the rest are computed server-side. */
const CUSTOM_SCOPE = '2'

// Computed, not a plain array: a plain one is built once when the page is set
// up, and keep-alive keeps that instance around, so the select would go on
// offering the language the page was first opened in -- including on screen.
const dataScopes = computed(() => [
  { value: '1', label: t('admin.sysRole.scopeOptions.all') },
  { value: CUSTOM_SCOPE, label: t('admin.sysRole.scopeOptions.custom') },
  { value: '3', label: t('admin.sysRole.scopeOptions.dept') },
  { value: '4', label: t('admin.sysRole.scopeOptions.deptAndBelow') },
  { value: '5', label: t('admin.sysRole.scopeOptions.self') }
])

const table = useTable<SysRole, SysRoleQuery>({
  api: listRole,
  idKey: 'roleId',
  defaultQuery: () => ({ roleName: undefined, roleKey: undefined, status: undefined })
})

// ── Menu tree, shared by create and edit ──────────────────────────
const menuChecked = ref<(string | number)[]>([])
const menuOptions = ref<Array<Record<string, unknown>>>([])
/**
 * Whether the role being edited is the super admin, which holds everything
 * implicitly and so has no tree to tick.
 *
 * A flag rather than the message itself: storing the text would freeze it in
 * the language it was assigned in, and this one stays on screen.
 */
const superAdminOnly = ref(false)

const menuEmptyText = computed(() =>
  superAdminOnly.value ? t('admin.sysRole.adminNeedsNoMenus') : t('admin.sysRole.treeLoading')
)

/** The full menu tree, fetched once. Role 0 means "everything on offer". */
const loadMenuTree = async() => {
  const response = await roleMenuTreeselect(0)
  menuOptions.value = (response.data?.menus ?? []) as Array<Record<string, unknown>>
}
void loadMenuTree()

/**
 * Rebuilt whenever the language changes.
 *
 * A plain object here is evaluated once, when the page is set up, and the page
 * is kept alive -- so a message already rendered under a field would keep the
 * language it was built in. useForm unwraps the ref, so :rules="roleForm.rules"
 * is unchanged.
 */
const rules = computed<FormRules>(() => ({
  roleName: [{ required: true, message: t('admin.sysRole.rules.roleName') }],
  roleKey: [{ required: true, message: t('admin.sysRole.rules.roleKey') }],
  roleSort: [{ required: true, message: t('admin.sysRole.rules.roleSort') }]
}))

const roleForm = useForm<SysRole, number>({
  defaultModel: () => ({
    roleId: undefined,
    roleName: undefined,
    roleKey: undefined,
    roleSort: 0,
    status: STATUS_NORMAL,
    menuIds: [],
    remark: undefined
  }),
  idKey: 'roleId',
  rules,
  // Computed, not `t(...)` directly: useForm reads the option on every render,
  // so a string resolved here once would pin the dialog to the language the
  // page was opened in.
  title: {
    create: computed(() => t('admin.sysRole.addTitle')),
    edit: computed(() => t('admin.sysRole.editTitle'))
  },
  api: {
    get: getRole,
    add: model => addRole({ ...model, menuIds: checkedMenuIds() }),
    update: model => updateRole({ ...model, menuIds: checkedMenuIds() }, model.roleId as number)
  },
  onSuccess: () => table.getList()
})

/**
 * Ids the menu tree has ticked.
 *
 * Only fully-checked nodes, which is what the previous version submitted -- it
 * read the half-checked set as well but then returned the checked one, so the
 * behaviour is preserved rather than quietly changed here.
 */
const checkedMenuIds = (): number[] => menuChecked.value.map(Number)

const handleAdd = () => {
  roleForm.openCreate()
  menuChecked.value = []
  superAdminOnly.value = false
}

const handleEdit = async(row: SysRole) => {
  await roleForm.openEdit(row)
  superAdminOnly.value = roleForm.model.roleKey === 'admin'
  menuChecked.value = roleForm.model.menuIds ?? []
}

// ── Data scope ────────────────────────────────────────────────────
const deptChecked = ref<(string | number)[]>([])
const deptOptions = ref<DeptTreeNode[]>([])

const scopeForm = useForm<SysRole, number>({
  defaultModel: () => ({ roleId: undefined, roleName: undefined, roleKey: undefined, dataScope: '1' }),
  idKey: 'roleId',
  api: { get: getRole },
  submit: model => dataScope({ ...model, deptIds: deptChecked.value.map(Number) }),
  // A function rather than a string: useForm keeps whatever it is given, and a
  // string would be resolved once, at setup.
  successMessage: () => t('admin.sysRole.dataScopeSaved'),
  onSuccess: () => table.getList()
})

const handleDataScope = async(row: SysRole) => {
  await scopeForm.openEdit(row)
  const response = await roleDeptTreeselect(row.roleId as number)
  deptOptions.value = response.data?.depts ?? []
  deptChecked.value = response.data?.checkedKeys ?? []
}

// ── Row actions ───────────────────────────────────────────────────
const { remove } = useRemove({
  api: delRole,
  onSuccess: () => table.getList()
})

const handleStatusChange = async(row: SysRole) => {
  const enabling = row.status === '2'
  const revert = () => { row.status = enabling ? '1' : '2' }

  // Two whole sentences rather than a verb spliced into one: 启用/停用 is the
  // object of the Chinese sentence but the verb of the English one.
  const question = enabling
    ? t('admin.sysRole.enableConfirm', { name: row.roleName })
    : t('admin.sysRole.disableConfirm', { name: row.roleName })

  try {
    await confirmAction({ content: question, okText: enabling ? t('common.enable') : t('common.disable') })
  } catch {
    revert()
    return
  }

  try {
    await changeRoleStatus(row.roleId as number, row.status as string)
    msgSuccess(enabling ? t('admin.sysRole.enableOk') : t('admin.sysRole.disableOk'))
  } catch {
    // The switch has already moved; put it back so it matches the server
    revert()
  }
}

const { exportExcel, exporting } = useExport()

// Built on each click rather than once, so the sheet is written in the
// language the reader is in when they ask for it.
const handleExport = () => exportExcel({
  header: [
    t('admin.sysRole.exportHeader.roleId'),
    t('admin.sysRole.exportHeader.roleName'),
    t('admin.sysRole.exportHeader.roleKey'),
    t('admin.sysRole.exportHeader.roleSort'),
    t('admin.sysRole.exportHeader.status'),
    t('admin.sysRole.exportHeader.createdAt')
  ],
  fields: ['roleId', 'roleName', 'roleKey', 'roleSort', 'status', 'createdAt'],
  // The switch in the status column reads 2 as on and 1 as off; the sheet used
  // to write those digits. See sys-oper-log for the same fix.
  rows: table.rows.map(row => ({
    ...row,
    status: dictLabel(sys_normal_disable.value, row.status)
  })) as Array<Record<string, unknown>>,
  filename: t('admin.sysRole.exportFilename')
})
</script>

<style lang="scss" scoped>
.permission-tree {
  width: 100%;
  max-height: 190px;
  overflow-y: auto;
  padding: 4px 0;
  border: 1px solid var(--ga-border-light);
  border-radius: var(--ga-radius-sm);
}
</style>
