<template>
  <section class="tree-nav" :aria-label="title">
    <div v-if="(title && showTitle) || $slots.actions" class="tree-nav__header">
      <strong v-if="title && showTitle" class="tree-nav__title">{{ title }}</strong>
      <div v-if="$slots.actions" class="tree-nav__actions"><slot name="actions" /></div>
    </div>
    <a-input v-model="search" :placeholder="searchPlaceholder" :input-attrs="{ 'aria-label': searchPlaceholder }" allow-clear>
      <template #prefix><icon-search /></template>
    </a-input>
    <slot name="feedback" />
    <a-spin :loading="loading" class="tree-nav__body">
      <a-result v-if="failed" status="error" :title="failedText" class="tree-nav__failed">
        <template #extra><a-button @click="emit('retry')">{{ t('common.retry') }}</a-button></template>
      </a-result>
      <a-tree
        v-else
        ref="tree"
        class="tree-nav__tree"
        role="tree"
        :aria-label="title"
        :data="nodes"
        :selected-keys="selected === undefined ? [] : [selected]"
        :expanded-keys="expandedKeys"
        :selectable="true"
        block-node
        @select="select"
        @expand="expanded = $event"
        @keydown="navigate"
      >
        <template #title="node">
          <span
            role="treeitem"
            :data-tree-key="node.key"
            :tabindex="focusKey === node.key ? 0 : -1"
            :aria-selected="selected === node.key"
            :aria-level="node.level"
            :aria-expanded="node.children?.length ? expandedKeys.includes(node.key) : undefined"
            class="tree-nav__node"
            @focus="focusKey = node.key"
          >
            <span class="tree-nav__name" :title="node.title">{{ node.title }}<span v-if="node.note" class="tree-nav__note"> · {{ node.note }}</span></span>
            <span v-if="node.count !== undefined" class="tree-nav__count">{{ node.count }}</span>
          </span>
        </template>
      </a-tree>
      <p v-if="!failed && search && !matched.length" class="tree-nav__help">{{ noMatchText ?? t('common.empty') }}</p>
    </a-spin>
    <p v-if="help" class="tree-nav__help">{{ help }}</p>
  </section>
</template>

<script setup lang="ts">
/**
 * Searchable tree navigation: the left-hand scope picker of a list page.
 *
 * Owns what every such tree repeated -- search that keeps a match's path,
 * expansion that opens under a search and remembers itself otherwise, a single
 * tab stop with arrow/Home/End/Enter navigation, counts aligned on the right,
 * and loading/failed states that stay inside the tree instead of blocking the
 * list beside it. The page supplies rows and reacts to `select`.
 *
 * `pinned` rows ("All", "Ungrouped") sit above the tree and are never filtered
 * out, so the way back to the whole list is always one click away.
 */
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TreeNodeData } from '@arco-design/web-vue'
import { filterTreeNav, flattenTreeNav, type TreeNavItem, type TreeNavNode } from './tree'

defineOptions({ name: 'TreeNav' })
const props = withDefaults(defineProps<{
  items: TreeNavItem[]
  /** Rows above the tree that a search never hides. */
  pinned?: TreeNavItem[]
  selected?: string | number
  /** Names the tree for assistive tech; also shown as the heading unless `showTitle` is false. */
  title: string
  showTitle?: boolean
  searchPlaceholder: string
  loading?: boolean
  failed?: boolean
  failedText?: string
  noMatchText?: string
  /** One muted line under the tree, e.g. what the counts mean. */
  help?: string
}>(), { pinned: () => [], selected: undefined, showTitle: true, loading: false, failed: false, failedText: undefined, noMatchText: undefined, help: undefined })
const emit = defineEmits<{ select: [key: string | number], retry: [] }>()
const { t } = useI18n()

const search = ref('')
const expanded = ref<(string | number)[]>([])
const focusKey = ref<string | number>()
const tree = ref<{ $el: HTMLElement }>()

const matched = computed(() => filterTreeNav(props.items, search.value))
const nodes = computed<TreeNavNode[]>(() => [...filterTreeNav(props.pinned), ...matched.value])
const parents = computed(() => flattenTreeNav(props.items).filter(item => item.children?.length).map(item => item.key))
const expandedKeys = computed(() => search.value.trim() ? parents.value : expanded.value)
const nodeMap = computed(() => new Map(flattenTreeNav(nodes.value).map(node => [node.key, node])))

// New parents open by default; ones the user closed stay closed across refreshes.
let known = new Set<string | number>()
watch(parents, keys => {
  const added = keys.filter(key => !known.has(key))
  known = new Set(keys)
  if (added.length) expanded.value = [...new Set([...expanded.value, ...added])]
}, { immediate: true })
const defaultFocusKey = () => props.selected !== undefined && nodeMap.value.has(props.selected) ? props.selected : nodes.value[0]?.key
watch(() => props.selected, () => { focusKey.value = defaultFocusKey() })
watch(nodes, () => { if (focusKey.value === undefined || !nodeMap.value.has(focusKey.value)) focusKey.value = defaultFocusKey() }, { immediate: true })

function select(keys: (string | number)[], data: { node?: TreeNodeData }) {
  // Arco 2.59 omits data.node for the valid numeric key 0.
  const key = keys[0] ?? data.node?.key
  if (key === undefined) return
  focusKey.value = key
  emit('select', key)
}
async function focus(key: string | number) {
  focusKey.value = key
  await nextTick()
  tree.value?.$el.querySelector<HTMLElement>(`[data-tree-key="${key}"]`)?.focus()
}
function navigate(event: KeyboardEvent) {
  const target = (event.target as HTMLElement).closest<HTMLElement>('[role="treeitem"]')
  const node = focusKey.value === undefined ? undefined : nodeMap.value.get(focusKey.value)
  if (!target || !node) return
  const items = Array.from(tree.value?.$el.querySelectorAll<HTMLElement>('[role="treeitem"]') ?? []).filter(item => item.getClientRects().length)
  const index = items.indexOf(target)
  const focusItem = (item?: HTMLElement) => { if (item) { item.focus(); item.scrollIntoView({ block: 'nearest' }) } }
  if (event.key === 'ArrowDown') focusItem(items[index + 1])
  else if (event.key === 'ArrowUp') focusItem(items[index - 1])
  else if (event.key === 'Home') focusItem(items[0])
  else if (event.key === 'End') focusItem(items.at(-1))
  else if (event.key === 'ArrowRight') {
    if (node.children.length && !expandedKeys.value.includes(node.key)) expanded.value = [...expanded.value, node.key]
    else if (node.children[0]) void focus(node.children[0].key)
  } else if (event.key === 'ArrowLeft') {
    if (node.children.length && expandedKeys.value.includes(node.key) && !search.value) expanded.value = expanded.value.filter(key => key !== node.key)
    else if (node.parentKey !== undefined) void focus(node.parentKey)
  } else if (event.key === 'Enter' || event.key === ' ') emit('select', node.key)
  else return
  event.preventDefault()
  event.stopPropagation()
}

/** Lets the owner clear the search, e.g. when its scope resets or the user changes. */
defineExpose({ clearSearch: () => { search.value = '' } })
</script>

<style scoped lang="scss">
.tree-nav { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.tree-nav__header { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 32px; }
.tree-nav__title { color: var(--color-text-1); font-size: var(--motor-font-size-14); font-weight: 600; }
.tree-nav__actions { display: flex; align-items: center; gap: 4px; margin-left: auto; }
.tree-nav__body { display: block; min-height: 96px; }
.tree-nav__tree { max-height: min(680px, calc(100dvh - 300px)); overflow: auto; }
.tree-nav__failed { padding: 16px 0; }
.tree-nav__node { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-width: 0; width: 100%; line-height: 28px; border-radius: var(--border-radius-small); }
.tree-nav__node:focus-visible { outline: 2px solid rgb(var(--primary-6)); outline-offset: 2px; }
.tree-nav__name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tree-nav__note { font-size: var(--motor-font-size-12); color: var(--color-text-2); }
.tree-nav__count { flex-shrink: 0; color: var(--color-text-2); font-size: var(--motor-font-size-12); font-variant-numeric: tabular-nums; }
.tree-nav__help { margin: 0; color: var(--color-text-2); font-size: var(--motor-font-size-12); line-height: 1.6; }
.tree-nav :deep(.arco-tree-node-title-text) { display: block; width: 100%; min-width: 0; }
.tree-nav :deep(.arco-tree-node-title) { min-width: 0; }
/* The selected row carries the accent; its count follows so the row reads as one unit. */
.tree-nav :deep(.arco-tree-node-selected) .tree-nav__count { color: rgb(var(--primary-6)); }
@media (max-width: 767px) { .tree-nav__node { min-height: 44px; } .tree-nav__tree { max-height: none; } }
</style>
