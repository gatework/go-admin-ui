<template>
  <PageContainer>
    <!-- /api/v1/menu answers with the whole tree; this page never had a pager -->
    <ProTable
      :table="table"
      :paginated="false"
      row-key="menuId"
      :actions-width="132"
      default-expand-all-rows
      :tree-props="{ children: 'children', hasChildren: 'hasChildren' }"
    >
      <template #search>
        <a-form-item :label="$t('admin.sysMenu.menuName')">
          <a-input
            v-model="table.query.title"
            :placeholder="$t('admin.sysMenu.menuNamePlaceholder')"
            allow-clear
          />
        </a-form-item>
        <a-form-item :label="$t('admin.sysMenu.status')">
          <a-select
            v-model="table.query.visible"
            :placeholder="$t('admin.sysMenu.statusPlaceholder')"
            allow-clear
          >
            <a-option
              v-for="item in sys_show_hide"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </a-select>
        </a-form-item>
      </template>

      <template #toolbar>
        <a-button v-permisaction="['admin:sysMenu:add']" type="primary" @click="handleAdd()">
          {{ $t('common.add') }}
        </a-button>
      </template>

      <a-table-column
        data-index="title"
        :title="$t('admin.sysMenu.menuName')"
        :width="180"
        ellipsis
        tooltip
      />
      <a-table-column data-index="icon" :title="$t('admin.sysMenu.icon')" :width="70">
        <template #cell="{ record: row }">
          <MenuIcon v-if="row.icon" :name="row.icon" />
        </template>
      </a-table-column>
      <a-table-column data-index="sort" :title="$t('admin.sysMenu.sort')" :width="70" />
      <a-table-column
        data-index="permission"
        :title="$t('admin.sysMenu.permission')"
        :width="150"
        ellipsis
        tooltip
      >
        <template #cell="{ record: row }">
          <a-popover v-if="row.sysApi && row.sysApi.length" trigger="hover" position="top" :content-style="{ width: 'min(520px, 90vw)' }">
            <template #content><a-table :data="row.sysApi" size="small" :pagination="false" :scroll="{ y: 260 }"><template #columns>
              <a-table-column data-index="title" :title="$t('admin.sysMenu.api')" :width="200">
                <template #cell="{ record: api }">
                  <a-tag v-if="!api.title" color="red">{{ $t('admin.sysMenu.apiUntitled') }}</a-tag>
                  <a-tag v-else :color="api.type === 'SYS' ? 'green' : 'gray'">
                    [{{ api.type }}] {{ api.title }}
                  </a-tag>
                </template>
              </a-table-column>
              <a-table-column data-index="path" :title="$t('admin.sysMenu.path')" :width="240">
                <template #cell="{ record: api }">
                  <MethodTag :method="api.action" />
                  {{ api.path }}
                </template>
              </a-table-column>
            </template></a-table></template>
            <template #default><span>{{ row.permission || '-' }}</span></template>
          </a-popover>
          <span v-else>{{ row.permission || '-' }}</span>
        </template>
      </a-table-column>
      <a-table-column
        data-index="component"
        :title="$t('admin.sysMenu.componentPath')"
        :width="160"
        ellipsis
        tooltip
      >
        <template #cell="{ record: row }">{{ row.menuType === 'A' ? row.path : row.component }}</template>
      </a-table-column>
      <a-table-column data-index="visible" :title="$t('admin.sysMenu.visible')" :width="90">
        <template #cell="{ record: row }">
          <!-- A button-level entry is never in the menu, so visibility is moot -->
          <span v-if="row.menuType === 'F'">--</span>
          <a-tag v-else :color="row.visible === '1' ? 'red' : 'green'">
            {{ dictLabel(sys_show_hide, row.visible) }}
          </a-tag>
        </template>
      </a-table-column>
      <a-table-column :title="$t('common.createdAt')" data-index="createdAt" :width="110">
        <template #cell="{ record: row }"><DateCell :value="row.createdAt" /></template>
      </a-table-column>

      <template #actions="{ row }">
        <a-button v-permisaction="['admin:sysMenu:edit']" type="text" @click="handleEdit(row)">
          {{ $t('common.edit') }}
        </a-button>
        <a-button v-permisaction="['admin:sysMenu:remove']" status="danger" type="text" @click="remove(row.menuId)">
          {{ $t('common.delete') }}
        </a-button>
        <!-- Icon rather than the words, per the two-button rule: this column is
             pinned, so every pixel it takes comes out of the columns that would
             otherwise scroll past it. -->
        <a-button
          v-permisaction="['admin:sysMenu:add']"

          class="row-icon-action"
          :title="$t('admin.sysMenu.addUnder', { title: row.title })"
          type="text"
          @click="handleAdd(row)"
        >
          <icon-plus />
        </a-button>
      </template>
    </ProTable>

    <AppModal
      v-model:visible="form.visible"
      :title="form.title"
      :width="880"
      modal-class="menu-editor"
      :mask-closable="false"
      @close="form.reset"
    >
      <a-form
        :ref="form.bindFormRef"
        class="menu-editor-form"
        :disabled="form.loading"
        :model="form.model"
        :rules="form.rules"
        layout="vertical"
      >
        <section class="menu-form-section">
          <header><h3>{{ $t('admin.sysMenu.sections.basic') }}</h3><p>{{ $t('admin.sysMenu.sections.basicHint') }}</p></header>
          <a-row :gutter="[20, 0]">
            <a-col :xs="24" :sm="12">
              <a-form-item :label="$t('admin.sysMenu.menuType')" field="menuType">
                <a-radio-group v-model="form.model.menuType">
                  <a-radio value="M">{{ $t('admin.sysMenu.typeDirectory') }}</a-radio>
                  <a-radio value="C">{{ $t('admin.sysMenu.typeMenu') }}</a-radio>
                  <a-radio value="F">{{ $t('admin.sysMenu.typeButton') }}</a-radio>
                </a-radio-group>
              </a-form-item>
            </a-col>
            <a-col :xs="24" :sm="12">
              <a-form-item :label="$t('admin.sysMenu.parent')" field="parentId">
                <a-tree-select
                  v-model="form.model.parentId"
                  :data="parentOptions"

                  :placeholder="$t('admin.sysMenu.parentPlaceholder')"

                  style="width: 100%"
                />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :sm="12">
              <a-form-item :label="$t('admin.sysMenu.title')" field="title">
                <a-input v-model="form.model.title" :placeholder="$t('admin.sysMenu.titlePlaceholder')" />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :sm="12">
              <a-form-item :label="$t('admin.sysMenu.displaySort')" field="sort">
                <a-input-number v-model="form.model.sort" style="width: 100%" :min="0" />
              </a-form-item>
            </a-col>
          </a-row>
        </section>
        <section v-if="!isButton" class="menu-form-section">
          <header><h3>{{ $t('admin.sysMenu.sections.routing') }}</h3><p>{{ $t('admin.sysMenu.sections.routingHint') }}</p></header>
          <a-row :gutter="[20, 0]">
            <a-col :xs="24" :sm="12">
              <a-form-item v-if="!isButton" :label="$t('admin.sysMenu.menuIcon')">
                <IconSelect v-model="form.model.icon" />
              </a-form-item>
            </a-col>
            <a-col v-if="!isButton" :xs="24" :sm="12">
              <a-form-item>
                <template #label>
                  <FieldLabel
                    :label="$t('admin.sysMenu.menuStatus')"
                    :tip="$t('admin.sysMenu.menuStatusTip')"
                  />
                </template>
                <a-radio-group v-model="form.model.visible">
                  <a-radio
                    v-for="item in sys_show_hide"
                    :key="item.value"
                    :value="item.value"
                  >{{ item.label }}</a-radio>
                </a-radio-group>
              </a-form-item>
            </a-col>
            <a-col v-if="!isButton" :xs="24" :sm="12">
              <a-form-item field="menuName">
                <template #label>
                  <FieldLabel
                    :label="$t('admin.sysMenu.routeName')"
                    :tip="$t('admin.sysMenu.routeNameTip')"
                  />
                </template>
                <a-input
                  v-model="form.model.menuName"
                  :placeholder="$t('admin.sysMenu.routeNamePlaceholder')"
                />
              </a-form-item>
            </a-col>
            <a-col v-if="!isButton" :xs="24" :sm="12">
              <a-form-item field="path">
                <template #label>
                  <FieldLabel
                    :label="$t('admin.sysMenu.routePath')"
                    :tip="$t('admin.sysMenu.routePathTip')"
                  />
                </template>
                <a-input
                  v-model="form.model.path"
                  :placeholder="$t('admin.sysMenu.routePathPlaceholder')"
                />
              </a-form-item>
            </a-col>
            <a-col v-if="!isButton" :xs="24" :sm="12">
              <a-form-item field="component">
                <template #label>
                  <FieldLabel
                    :label="$t('admin.sysMenu.componentPath')"
                    :tip="$t('admin.sysMenu.componentPathTip')"
                  />
                </template>
                <a-input
                  v-model="form.model.component"
                  :placeholder="$t('admin.sysMenu.componentPathPlaceholder')"
                />
              </a-form-item>
            </a-col>
            <a-col v-if="!isButton" :xs="24" :sm="12">
              <a-form-item>
                <template #label>
                  <FieldLabel :label="$t('admin.sysMenu.isFrame')" :tip="$t('admin.sysMenu.isFrameTip')" />
                </template>
                <a-radio-group v-model="form.model.isFrame">
                  <a-radio value="0">{{ $t('admin.sysMenu.yes') }}</a-radio>
                  <a-radio value="1">{{ $t('admin.sysMenu.no') }}</a-radio>
                </a-radio-group>
              </a-form-item>
            </a-col>
          </a-row>
        </section>
        <section v-if="hasPermission" class="menu-form-section">
          <header><h3>{{ $t('admin.sysMenu.sections.access') }}</h3><p>{{ $t('admin.sysMenu.sections.accessHint') }}</p></header>
          <a-row :gutter="[20, 0]">
            <a-col v-if="hasPermission" :xs="24" :sm="12">
              <a-form-item>
                <template #label>
                  <FieldLabel
                    :label="$t('admin.sysMenu.permission')"
                    :tip="$t('admin.sysMenu.permissionTip')"
                  />
                </template>
                <a-input
                  v-model="form.model.permission"
                  :placeholder="$t('admin.sysMenu.permissionPlaceholder')"
                  maxlength="50"
                />
              </a-form-item>
            </a-col>
            <a-col v-if="hasPermission" :span="24">
              <a-form-item>
                <template #label>
                  <FieldLabel
                    :label="$t('admin.sysMenu.apiPermission')"
                    :tip="$t('admin.sysMenu.apiPermissionTip')"
                  />
                </template>
                <a-transfer
                  v-model="grantedApiIds"
                  show-search

                  :titles="[$t('admin.sysMenu.unauthorized'), $t('admin.sysMenu.authorized')]"

                  :data="apiOptions.map(api => ({ value: String(api.id), label: api.title || api.path || '', disabled: false }))"
                  class="api-transfer"
                />
              </a-form-item>
            </a-col>
          </a-row>
        </section>
      </a-form>
      <template #footer>
        <a-button @click="form.close">{{ $t('common.dialogCancel') }}</a-button>
        <a-button type="primary" :loading="form.submitting" @click="form.submit">{{ $t('common.dialogConfirm') }}</a-button>
      </template>
    </AppModal>
  </PageContainer>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import type { FormRules } from '@/types/ui'
import type { TreeNodeData } from '@arco-design/web-vue'

import AppModal from '@/components/AppModal/index.vue'
import PageContainer from '@/components/PageContainer/index.vue'
import ProTable from '@/components/ProTable/index.vue'
import DateCell from '@/components/DateCell/index.vue'
import MethodTag from '@/components/MethodTag/index.vue'
import FieldLabel from '@/components/FieldLabel/index.vue'
import MenuIcon from '@/components/MenuIcon/index.vue'
import IconSelect from '@/components/IconSelect/index.vue'
import { useTable, useForm, useRemove, useDict, useTreePicker, dictLabel } from '@/composables'

import { listMenu, getMenu, addMenu, updateMenu, delMenu } from '@/api/admin/sys-menu'
import { listSysApi } from '@/api/admin/sys-api'
import type { SysApi, SysMenu, SysMenuQuery } from '@/types/admin'

// Must match the menu_name the backend serves, or keep-alive silently misses
defineOptions({ name: 'SysMenuManage' })

const { t } = useI18n()

const { sys_show_hide } = useDict('sys_show_hide')

const table = useTable<SysMenu, SysMenuQuery>({
  api: listMenu,
  idKey: 'menuId',
  paginated: false,
  defaultQuery: () => ({ title: undefined, visible: undefined })
})

const ROOT_ID = 0

/** The unfiltered tree; see useTreePicker for why it is not `table.rows`. */
const parent = useTreePicker<SysMenu>({
  api: () => listMenu({}),
  idKey: 'menuId',
  labelKey: 'title',
  rootLabel: computed(() => t('admin.sysMenu.rootCategory')),
  rootId: ROOT_ID
})

// API icon names are strings; Arco reserves `icon` for a render function.
const parentOptions = computed(() => {
  const nodes = (items: SysMenu[]): TreeNodeData[] => items.map(item => ({
    key: item.menuId, title: item.title, children: item.children ? nodes(item.children) : undefined
  }))
  return nodes(parent.options)
})

// ── The API permission transfer ───────────────────────────────────
const apiOptions = ref<SysApi[]>([])

const loadApiOptions = async() => {
  try {
    // BUS routes only: the SYS ones are infrastructure, not grantable
    const response = await listSysApi({ pageSize: 10000, type: 'BUS' })
    apiOptions.value = response.data?.list ?? []
  } catch {
    // Reported by the interceptor. Without the catch this rejects inside the
    // mounted hook with nobody attached, and the transfer silently renders
    // empty -- from which any move writes `sysApi: []` onto the model.
  }
}

onMounted(loadApiOptions)

/**
 * Rebuilt whenever the language changes.
 *
 * A plain object here is evaluated once, when the page is set up, and the page
 * is kept alive -- so a message already rendered under a field would keep the
 * language it was built in. useForm unwraps the ref, so :rules="form.rules" is
 * unchanged.
 */
const rules = computed<FormRules>(() => ({
  title: [{ required: true, message: t('admin.sysMenu.rules.title') }],
  sort: [{ required: true, message: t('admin.sysMenu.rules.sort') }]
}))

const form = useForm<SysMenu, number>({
  defaultModel: () => ({
    menuId: undefined,
    parentId: ROOT_ID,
    menuName: undefined,
    title: undefined,
    icon: undefined,
    menuType: 'M',
    component: undefined,
    path: undefined,
    permission: undefined,
    sort: 0,
    isFrame: '1',
    visible: '0',
    apis: [],
    sysApi: []
  }),
  idKey: 'menuId',
  rules,
  // Computed, not `t(...)` directly: useForm reads the option on every render,
  // so a string resolved here once would pin the dialog to the language the
  // page was opened in.
  title: {
    create: computed(() => t('admin.sysMenu.addTitle')),
    edit: computed(() => t('admin.sysMenu.editTitle'))
  },
  api: {
    get: getMenu,
    add: addMenu,
    update: model => updateMenu(model, model.menuId as number)
  },
  onSuccess: () => {
    parent.invalidate()
    return table.getList()
  }
})

/** 'F' is a button-level entry: it has no route, icon or visibility of its own. */
const isButton = computed(() => form.model.menuType === 'F')
/** Only menus and buttons carry a permission code and grant API routes. */
const hasPermission = computed(() => form.model.menuType === 'C' || form.model.menuType === 'F')

/**
 * Granted route ids, with the expanded `sysApi` list kept in step.
 *
 * The previous version maintained `sysApi` incrementally from the transfer's
 * move events, and its removal branch called `list.push()` with no argument --
 * so revoking a route emptied the list instead of shrinking it. Deriving it from
 * the ids on write makes that impossible to get wrong.
 */
const grantedApiIds = computed<string[]>({
  get: () => (form.model.apis ?? []).map(String),
  set: (ids) => {
    form.model.apis = ids.map(Number)
    form.model.sysApi = apiOptions.value.filter(api => ids.includes(String(api.id)))
  }
})

const handleAdd = (row?: SysMenu) => {
  void parent.ensure()
  form.openCreate(row ? { parentId: row.menuId } : { parentId: ROOT_ID })
}

const handleEdit = (row: SysMenu) => {
  void parent.ensure()
  return form.openEdit(row)
}

const { remove } = useRemove({
  api: delMenu,
  confirmText: () => t('admin.sysMenu.removeConfirm'),
  onSuccess: () => {
    parent.invalidate()
    return table.getList()
  }
})
</script>

<style scoped lang="scss">
:global(.menu-editor .arco-modal-body) { max-height: min(680px, calc(100dvh - 160px)); overflow-y: auto; }
:global(.menu-editor) { max-width: calc(100vw - 32px); }
.menu-form-section + .menu-form-section { margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--color-border-2); }
.menu-form-section header { margin-bottom: 20px; h3 { font-size: 15px; margin: 0 0 5px; } p { font-size: 12px; color: var(--ga-text-2); margin: 0; } }
.menu-editor-form :deep(.arco-form-item) { margin-bottom: 20px; }
.api-transfer { display: flex; width: 100%; }
.api-transfer :deep(.arco-transfer-view) { flex: 1; min-width: 0; width: auto; }
.api-transfer :deep(.arco-transfer-view-list) { height: 220px; }
@media (max-width: 600px) { .api-transfer { flex-direction: column; gap: 8px; } .api-transfer :deep(.arco-transfer-view) { width: 100%; flex: auto; } .api-transfer :deep(.arco-transfer-operations) { flex-direction: row; justify-content: center; } }
</style>
