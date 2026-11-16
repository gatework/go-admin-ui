<template>
  <section class="nav-list" :aria-label="title">
    <div class="nav-list__header">
      <strong class="nav-list__title">{{ title }}<span v-if="total !== undefined" class="nav-list__total">{{ total }}</span></strong>
      <div v-if="$slots.actions" class="nav-list__actions"><slot name="actions" /></div>
    </div>
    <a-input-search
      v-if="searchPlaceholder"
      :model-value="search"
      :placeholder="searchPlaceholder"
      :input-attrs="{ 'aria-label': `${title} · ${searchPlaceholder}` }"
      allow-clear
      @update:model-value="emit('update:search', $event)"
      @search="emit('search')"
      @press-enter="emit('search')"
      @clear="emit('update:search', ''); emit('search')"
    />
    <a-spin :loading="loading" class="nav-list__body">
      <ul v-if="items.length" class="nav-list__items">
        <li v-for="item in items" :key="item.key">
          <button
            type="button"
            class="nav-list__item"
            :class="{ 'is-selected': item.key === selected }"
            :aria-current="item.key === selected ? 'true' : undefined"
            @click="emit('select', item.key)"
          >
            <span class="nav-list__item-title">{{ item.title }}</span>
            <span v-if="item.description || $slots.meta" class="nav-list__item-meta">
              <span v-if="item.description">{{ item.description }}</span>
              <slot name="meta" :item="item" />
            </span>
          </button>
        </li>
      </ul>
      <p v-else-if="!loading" class="nav-list__empty">{{ emptyText }}</p>
    </a-spin>
    <a-pagination
      v-if="total !== undefined && total > pageSize"
      class="nav-list__pager"
      simple
      size="small"
      :total="total"
      :current="page"
      :page-size="pageSize"
      @change="emit('page', $event)"
    />
  </section>
</template>

<script setup lang="ts" generic="Item extends NavListItem">
/**
 * A short, selectable list beside a workspace: saved queries, drafts,
 * controllers, firewall instances.
 *
 * Rows are buttons with `aria-current`, the selected one carrying the accent
 * the way a TreeNav row does, so a page can stack a tree and a list in one
 * sidebar and they read as one system. Searching is optional; the pager only
 * appears when there is a second page; an empty list is one muted line, not an
 * illustration squeezed into a 244px column.
 */
import type { NavListItem } from './types'

defineOptions({ name: 'NavList' })
withDefaults(defineProps<{
  title: string
  items: Item[]
  selected?: string | number
  /** Total across pages; shows a count next to the title and enables paging. */
  total?: number
  page?: number
  pageSize?: number
  loading?: boolean
  emptyText: string
  /** Set to show a search box. */
  searchPlaceholder?: string
  search?: string
}>(), { selected: undefined, total: undefined, page: 1, pageSize: 10, loading: false, searchPlaceholder: undefined, search: '' })
const emit = defineEmits<{ select: [key: Item['key']], page: [page: number], search: [], 'update:search': [value: string] }>()
defineSlots<{ actions?: () => unknown, meta?: (scope: { item: Item }) => unknown }>()
</script>

<style scoped lang="scss">
.nav-list { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.nav-list__header { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 32px; }
.nav-list__title { display: flex; align-items: baseline; gap: 8px; color: var(--color-text-1); font-size: var(--motor-font-size-14); font-weight: 600; }
.nav-list__total { color: var(--color-text-2); font-size: var(--motor-font-size-12); font-weight: 400; font-variant-numeric: tabular-nums; }
.nav-list__actions { display: flex; align-items: center; gap: 4px; margin-left: auto; }
.nav-list__body { display: block; min-height: 40px; }
.nav-list__items { display: flex; flex-direction: column; gap: 2px; margin: 0 -4px; padding: 0; list-style: none; }

.nav-list__item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  min-height: 36px;
  padding: 7px 8px;
  border: 0;
  border-radius: var(--border-radius-small);
  background: transparent;
  color: var(--color-text-1);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.15s ease-out;

  &:hover { background: var(--color-fill-2); }
  &:focus-visible { outline: 2px solid rgb(var(--primary-6)); outline-offset: -2px; }

  &.is-selected {
    background: rgb(var(--primary-1));
    .nav-list__item-title { color: rgb(var(--primary-6)); font-weight: 600; }
  }
}

.nav-list__item-title { min-width: 0; overflow-wrap: anywhere; line-height: 1.5; }
.nav-list__item-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; color: var(--color-text-2); font-size: var(--motor-font-size-12); line-height: 1.5; overflow-wrap: anywhere; }
.nav-list__empty { margin: 0; padding: 8px 0; color: var(--color-text-2); font-size: var(--motor-font-size-12); line-height: 1.6; }
.nav-list__pager { justify-content: center; }

@media (max-width: 767px), (pointer: coarse) {
  .nav-list__item { min-height: 44px; }
}
</style>
