<template>
  <div ref="rootRef" class="pro-table" :class="{ 'pro-table--flat': !panels }">
    <div v-if="asCards && $slots.search" class="pro-table__filter-bar">
      <a-button type="text" :aria-expanded="filtersOpen" @click="filtersOpen = !filtersOpen">
        <template #icon><icon-search /></template>{{ $t('components.proTable.filters') }}<template v-if="activeFilters"> · {{ activeFilters }}</template>
      </a-button>
    </div>
    <a-drawer
      v-if="asCards && $slots.search"
      v-model:visible="filtersOpen"
      placement="bottom"
      height="auto"
      :footer="false"
      :title="$t('components.proTable.filters')"
      class="pro-table__sheet"
      role="dialog"
      aria-modal="true"
      :aria-label="$t('components.proTable.filters')"
      unmount-on-close
      :data-dialog-focus="restoreFilterFocus.id"
      @open="restoreFilterFocus.open"
      @close="restoreFilterFocus"
    >
      <a-form :model="table.query" layout="vertical" class="pro-table__sheet-form" @submit-success="submitFilters">
        <slot name="search" />
        <div class="pro-table__sheet-actions">
          <a-button @click="resetFilters">{{ $t('common.reset') }}</a-button>
          <a-button type="primary" html-type="submit" :loading="table.loading">{{ $t('components.proTable.showResults') }}</a-button>
        </div>
      </a-form>
    </a-drawer>
    <component :is="panelTag" v-if="$slots.search && !asCards" class="pro-table__search-panel">
      <a-form :model="table.query" layout="inline" class="pro-table__search" :style="{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, '--wide-span': Math.min(2, cols) }" :data-visible="collapsed ? collapsible() : 0" @submit-success="table.search">
        <slot name="search" />
        <div class="pro-table__search-actions">
          <a-button @click="handleReset">{{ $t('common.reset') }}</a-button>
          <a-button type="primary" html-type="submit" :loading="table.loading">{{ $t('common.search') }}</a-button>
          <a-button v-if="collapsible()" type="text" @click="collapsed = !collapsed">
            {{ collapsed ? $t('components.proTable.expand') : $t('components.proTable.collapse') }}
            <icon-down class="pro-table__search-caret" :class="{ 'is-open': !collapsed }" />
          </a-button>
        </div>
      </a-form>
    </component>
    <component :is="panelTag" class="pro-table__data-panel">
      <div class="pro-table__data">
        <div v-if="$slots.toolbar && !asCards" class="pro-table__toolbar">
          <slot name="toolbar" />
          <a-button class="pro-table__refresh" :loading="table.loading" shape="circle" :title="$t('common.refresh')" :aria-label="$t('common.refresh')" @click="table.getList"><template #icon><icon-refresh /></template></a-button>
        </div>
        <MobileCards
          v-if="asCards"
          :rows="stack as unknown as Record<string, unknown>[]"
          :columns="cardColumns()"
          :row-key="rowKey"
          :selection="selection"
          :actions="!!$slots.actions"
          :selected="selectedKeys"
          :loading="table.loading"
          :has-more="hasMore"
          :show-end="table.total > table.query.pageSize"
          @toggle="row => toggleCardRow(row as unknown as TRow)"
          @load-more="loadMore"
        >
          <template v-if="$slots.actions" #actions="scope"><slot name="actions" v-bind="scope" /></template>
        </MobileCards>
        <a-empty v-if="asCards && !table.loading && !stack.length" :description="$t('common.empty')" />
        <a-table
          v-if="!asCards"
          ref="tableRef"
          :loading="table.loading"
          :data="table.rows as TableData[]"
          :row-key="rowKey"
          :pagination="false"
          :selected-keys="Array.from(selectedKeys) as (string | number)[]"
          :row-selection="selection ? { type: 'checkbox', showCheckedAll: true, onlyCurrent: true } : undefined"
          v-bind="$attrs"
          @selection-change="selectRows"
          @sorter-change="sortRows"
        >
          <template #columns>
            <slot />
            <a-table-column v-if="$slots.actions" :title="$t('common.actions')" fixed="right" :width="Number(actionsWidth)">
              <template #cell="{ record, rowIndex }"><div class="pro-table__actions"><slot name="actions" v-bind="{ row: record, $index: rowIndex }" /></div></template>
            </a-table-column>
          </template>
          <template #empty><slot name="empty"><a-empty :description="$t('common.empty')" /></slot></template>
        </a-table>
        <div v-if="asCards && $slots.toolbar" class="pro-table__fab">
          <div v-show="fabOpen" class="pro-table__fab-menu">
            <slot name="toolbar" />
            <a-button class="pro-table__fab-refresh" :loading="table.loading" @click="table.getList"><template #icon><icon-refresh /></template>{{ $t('common.refresh') }}</a-button>
          </div>
          <button type="button" class="pro-table__fab-btn" :class="{ 'is-open': fabOpen }" :aria-expanded="fabOpen" :aria-label="$t('components.proTable.pageActions')" @click="fabOpen = !fabOpen"><icon-plus /></button>
        </div>
        <Pagination v-if="paginated && !asCards" v-show="table.total > 0" :total="table.total" :page="table.query.pageIndex" :limit="table.query.pageSize" @pagination="table.handlePagination" />
      </div>
    </component>
  </div>
</template>

<script setup lang="ts" generic="TRow extends object, TQuery extends object">
import { nextTick, ref, computed, watch, useSlots, type Ref } from 'vue'
import { Card as ACard, type TableData } from '@arco-design/web-vue'
import { IconDown, IconPlus, IconRefresh, IconSearch } from '@arco-design/web-vue/es/icon'
import Pagination from '@/components/Pagination/index.vue'
import MobileCards from './MobileCards.vue'
import { readCardColumns } from './columns'
import { searchFieldSpans, colsFor, collapseTo } from './search'
import { useElementWidth } from '@/composables/useElementWidth'
import { useNarrowScreen } from '@/composables/useNarrowScreen'
import { useDialogFocus } from '@/composables/useDialogFocus'
import type { UseTableReturn } from '@/composables/useTable'

/**
 * Wiring for a list page: search form, toolbar, table and pagination, all bound
 * to one useTable result.
 *
 * Columns stay as <a-table-column> in the default slot rather than moving into
 * a `columns` array. A column config looks tidier until the first page needs a
 * switch, a tag, a nested prop or a conditional button -- then it grows render
 * functions and per-type flags, and ends up a worse version of the slot API
 * Arco already has. What repeats across pages is the plumbing, so only
 * the plumbing is here.
 *
 *   <ProTable :table="table" selection row-key="userId">
 *     <template #search>...arco-form-items...</template>
 *     <template #toolbar>...buttons...</template>
 *     <a-table-column label="登录名" prop="username" />
 *   </ProTable>
 *
 * Attributes not listed below land on the inner a-table, so `border`,
 * `max-height`, `row-class-name` and the rest work as usual.
 */
defineOptions({ name: 'ProTable', inheritAttrs: false })

const props = withDefaults(defineProps<{
  /**
   * The useTable result driving this table.
   *
   * The component is generic in the row and query types rather than declaring
   * them as some open Record: `UseTableReturn` is invariant in both -- among
   * other things it holds `(rows: TRow[]) => void` -- so a widened parameter
   * would reject every page that types its own rows, which is the point of
   * typing them.
   */
  table: UseTableReturn<TRow, TQuery>
  /** Render a leading selection column. */
  selection?: boolean
  /** Primary key. Also enables selection that survives paging. */
  rowKey?: string
  /**
   * Render the pager. Turn off for the endpoints that answer with the whole
   * collection -- pass `paginated: false` to useTable as well, so it stops
   * sending paging keys the endpoint does not read.
   */
  paginated?: boolean
  /**
   * Width of the action column. Two text buttons need about 120px, two plus an
   * overflow menu about 140. Keep it tight: this column is pinned, so whatever
   * it takes is taken from the columns that have to scroll past it.
   */
  actionsWidth?: number | string
  /**
   * Swap the table for a card list below `cardBreakpoint`. Turn off for tables
   * whose value is the side-by-side comparison itself -- the generator's field
   * editor is the one such page here.
   */
  card?: boolean
  /** Viewport width, in px, below which cards take over. */
  cardBreakpoint?: number
  /**
   * Draw the two halves as cards. Turn off inside a dialog, which is a panel
   * already -- cards within a card read as a stack of boxes, and the dialog's
   * own padding is the framing the content needs.
   */
  panels?: boolean
  /** Preserve hierarchical rows with a-table at every viewport size. */
  defaultExpandAllRows?: boolean
  treeProps?: { children?: string, hasChildren?: string, checkStrictly?: boolean }
}>(), {
  card: true,
  cardBreakpoint: 768,
  selection: false,
  rowKey: '',
  paginated: true,
  actionsWidth: 120,
  panels: true,
  treeProps: undefined
})

const tableRef = ref()
// Native defaults run before async rows arrive. Expand each fetched tree once;
// subsequent user collapse/expand remains under the table's own control.
watch(() => props.table.rows, async() => {
  if (props.defaultExpandAllRows) {
    await nextTick()
    tableRef.value?.expandAll(true)
  }
})
const rootRef = ref<HTMLElement>()
const panelWidth = useElementWidth(rootRef)

/**
 * resetQuery drops the sort key from the query, but the header keeps drawing
 * its arrow until a-table is told as well -- leaving the column marked as
 * sorted while the list is not. Clearing it lives here rather than in useTable,
 * which stays free of anything Arco.
 */
let resettingSort = false
const handleReset = async() => {
  resettingSort = true
  try { tableRef.value?.resetSorters() } finally { resettingSort = false }
  // Not required for correctness: with reserve-selection gone, a-table clears
  // its own selection as soon as `rows` is reassigned, and emits
  // selection-change so useTable follows. This only makes the boxes untick on
  // the click rather than when the response lands -- otherwise a slow list
  // request leaves them visibly ticked while the bulk buttons are already
  // disabled. Do NOT copy this onto every data-changing path; the others are
  // handled by that reassignment.
  props.table.handleSelectionChange([])
  await props.table.resetQuery()
}

// Shared with the pages, which need the same answer -- see useNarrowScreen.
const slots = useSlots()
const narrow = useNarrowScreen(props.cardBreakpoint - 1)
// Tree expansion belongs to a-table until cards have a hierarchy contract.
const asCards = computed(() => props.card && narrow.value && !props.treeProps)

/**
 * Read on every render rather than memoised: a page may add or drop a column
 * with v-if, and a cached list would keep showing the old one. Reading is a
 * walk over a handful of vnodes, which is cheaper than being wrong.
 */
const cardColumns = () => readCardColumns(slots.default)

// Both presentations read the same selection, including external resets.
const selectedKeys = computed(() => new Set(
  props.table.selection.map(row => keyOf(row))
))

const keyOf = (row: TRow) => {
  if (!props.rowKey) return row
  return props.rowKey.split('.').reduce<unknown>(
    (value, key) => (value == null ? undefined : (value as Record<string, unknown>)[key]),
    row as unknown
  )
}

const toggleCardRow = (row: TRow) => {
  const key = keyOf(row)
  const next = props.table.selection.filter(picked => keyOf(picked) !== key)
  if (next.length === props.table.selection.length) next.push(row)
  props.table.handleSelectionChange(next)
}

// Leaving the card view hands selection back to a-table, which starts empty;
// carrying stale rows across would leave the bulk buttons enabled for rows
// nothing is showing as ticked.
watch(asCards, () => {
  props.table.handleSelectionChange([])
})

/**
 * Columns in the search grid, from the panel's own width -- not the window's,
 * which is a different number on any page that puts something beside the table.
 * Below 768px the filters are in the sheet instead, so the single-column case
 * only comes up in a very narrow panel on a wide screen.
 */
const cols = computed(() => colsFor(panelWidth.value))

// Both halves are drawn the same way, so what a panel is gets said once.
const panelTag = computed(() => (props.panels ? ACard : 'div'))

const collapsed = ref(true)

/**
 * How many filters stay on screen when the panel is collapsed, 0 meaning it
 * shows all of them.
 *
 * Read during render, like the card columns and for the same reason: a page can
 * add or drop a filter, and calling the slot from a computed would hold vnodes
 * built in someone else's render context. It costs a handful of vnodes -- the
 * fields' own contents sit in lazy slots that are not invoked -- and it is not
 * re-run by typing in a filter, which belongs to that field's render effect
 * rather than this one.
 */
const collapsible = () => collapseTo(searchFieldSpans(slots.search), cols.value)

const filtersOpen = ref(false)
const restoreFilterFocus = useDialogFocus(() => filtersOpen.value)
const fabOpen = ref(false)

// The sheet closes on submit: on a phone the result *is* the feedback, and a
// panel left open would cover it.
const submitFilters = async() => {
  await props.table.search()
  filtersOpen.value = false
}

const resetFilters = async() => {
  await handleReset()
  filtersOpen.value = false
}

// Leaving the narrow layout with the menu open would leave it floating over a
// desktop toolbar that is visible again anyway.
watch(asCards, cards => { if (!cards) fabOpen.value = false })

/**
 * How many filters are actually applied, for the button's badge.
 *
 * Read off the query rather than the form, because a filter can be set from
 * outside it -- clicking the department tree on sys-user, or a chart
 * drill-down -- and those are exactly the ones a user would not think to look
 * for behind a collapsed panel.
 */
const PAGING_KEYS = new Set(['pageIndex', 'pageSize', 'orderBy', 'sort', 'order'])
const activeFilters = computed(() =>
  Object.entries(props.table.query as Record<string, unknown>).filter(([key, value]) => {
    if (PAGING_KEYS.has(key)) return false
    if (value === undefined || value === null || value === '') return false
    return !(Array.isArray(value) && value.length === 0)
  }).length
)

/**
 * Cards accumulate; the table paginates.
 *
 * A pager is a poor fit for a phone -- the controls alone measure 450px against
 * a 317px column, and nobody types a page number on a touch screen. So in card
 * mode each page is appended to what is already on screen and the pager is
 * replaced by a sentinel that loads the next one as it scrolls into view.
 *
 * Kept here rather than in useTable so the desktop path is untouched: useTable
 * still replaces `rows` per page, and this only stacks them for the cards.
 */
const stack = ref([]) as Ref<TRow[]>
const pages = new Map<number, TRow[]>()
let stackQuery = ''
const querySignature = () => JSON.stringify(Object.entries(props.table.query).filter(([key]) => key !== 'pageIndex'))

watch(() => props.table.rows, rows => {
  if (!asCards.value) return
  const page = props.paginated ? props.table.query.pageIndex : 1
  const signature = querySignature()
  if (page <= 1 || signature !== stackQuery || !props.table.total) pages.clear()
  stackQuery = signature
  pages.set(page, [...rows])
  const combined = [...pages.entries()].sort(([a], [b]) => a - b).flatMap(([, items]) => items)
  // A refresh replaces its page. Stable keys also prevent duplicates when an
  // insertion moves a record across a page boundary between requests.
  stack.value = [...new Map(combined.map(row => [keyOf(row), row])).values()]
  const selected = selectedKeys.value
  props.table.handleSelectionChange(page <= 1 ? [] : stack.value.filter(row => selected.has(keyOf(row))))
}, { immediate: true })

// Entering card mode mid-session starts from whatever page is loaded; leaving
// it hands the list back to the pager, which reads table.rows directly.
watch(asCards, cards => {
  pages.clear()
  if (cards) {
    stackQuery = querySignature()
    pages.set(props.table.query.pageIndex || 1, [...props.table.rows])
    stack.value = [...props.table.rows]
  }
})

const hasMore = computed(() => props.paginated && props.table.query.pageIndex * props.table.query.pageSize < props.table.total)

const loadMore = () => {
  if (props.table.loading || !hasMore.value) return
  return props.table.handlePagination({
    page: props.table.query.pageIndex + 1,
    limit: props.table.query.pageSize
  })
}

/**
 * Ticking a row from a click on the row: the one thing a-table's own instance
 * does that `table` cannot. Exposed by name rather than by handing out the
 * instance, so the rest of its imperative API does not become an ambient escape
 * hatch -- the same reason the generator's forms expose `validate` and not their
 * FormInstance.
 */
const selectRows = (keys: (string | number)[]) => {
  const selected = new Set(keys)
  const collect = (rows: TRow[]): TRow[] => rows.flatMap(row => {
    const children = (row as Record<string, unknown>)[props.treeProps?.children || 'children']
    return [row, ...(Array.isArray(children) ? collect(children as TRow[]) : [])]
  })
  props.table.handleSelectionChange(collect(props.table.rows).filter(row => selected.has(keyOf(row) as string | number)))
}
const sortRows = (dataIndex: string, direction: string) => {
  if (resettingSort) return
  return props.table.handleSortChange({
    prop: dataIndex || null,
    order: direction === 'ascend' ? 'ascending' : direction === 'descend' ? 'descending' : null
  })
}
watch(() => props.table.rows, () => { if (!asCards.value) props.table.handleSelectionChange([]) })
defineExpose({
  toggleRowSelection: (row: TRow, selected?: boolean) => {
    const checked = selected ?? !selectedKeys.value.has(keyOf(row))
    const next = props.table.selection.filter(picked => keyOf(picked) !== keyOf(row))
    if (checked) next.push(row)
    props.table.handleSelectionChange(next)
  }
})
</script>

<style lang="scss" scoped>
/*
 * Two cards: the query above, the data below.
 *
 * Drawn here rather than by each page, so the seam sits in the same place on
 * all of them. They are separate surfaces because they answer to different
 * things -- the form decides which rows are on screen, the table and its
 * toolbar act on the rows that already are -- and a page-coloured gap says that
 * more plainly than a rule inside one card, which reads as one block of
 * controls with a line drawn through it.
 *
 * Neither panel needs a rule of its own: arco-card draws the surface, and the gap
 * between them is the one the stylesheet already gives any two stacked cards
 * (.arco-card + .arco-card), so a list page is spaced like everything else.
 */

/*
 * Inside a dialog the cards come off -- the dialog is the card -- and the two
 * halves are separated the way this layout separated them before the panels
 * existed.
 */
.pro-table--flat .pro-table__search {
  padding-bottom: 12px;
  margin-bottom: 12px;
  border-bottom: 1px solid var(--ga-border-light);
}

/*
 * The filter grid.
 *
 * Column count is set inline from the measured panel width -- the stylesheet
 * cannot see how much room the component was given, only how wide the window
 * is, and those differ on any page that puts something beside the table.
 * minmax(0, 1fr) rather than 1fr: a date range picker has a min-content width
 * of its own, and plain 1fr lets it push its column past its share.
 */
.pro-table__search {
  display: grid;
  column-gap: 16px;
  row-gap: 16px;

  :deep(.arco-form-item) {
    /* The grid owns the spacing; the form-item's own bottom margin would add a
       second, uneven gap to it. */
    margin: 0;
    width: 100%;
    min-width: 0;
  }

  /* Fields fill their column. Pages used to set a pixel width on each control,
     which is what an inline row needs and what a grid column undoes. */
  :deep(.arco-input-wrapper),
  :deep(.arco-select-view),
  :deep(.arco-tree-select),
  :deep(.arco-picker) { width: 100%; }
}

/*
 * Collapsing.
 *
 * data-visible is how many fields stay on screen, and 0 means the panel is
 * showing all of them. :nth-of-type counts rendered elements, so a field
 * switched off with v-if -- sys-user's department filter on the desktop layout
 * -- does not take up one of the visible slots, and searchFieldSpans skips it
 * for the same reason.
 *
 * The buttons are not an arco-form-item, so they are never the element this hides.
 */
.pro-table__search[data-visible="1"] :deep(.arco-form-item:nth-of-type(n + 2)),
.pro-table__search[data-visible="2"] :deep(.arco-form-item:nth-of-type(n + 3)),
.pro-table__search[data-visible="3"] :deep(.arco-form-item:nth-of-type(n + 4)) {
  display: none;
}

/*
 * Last column, hard against the right edge -- the same edge the toolbar, the
 * row actions and the pager below all end on.
 *
 * grid-column: -2 / -1 pins them there whatever the field count is: with a row
 * to spare they sit at the end of it, and with the row full they take the last
 * column of the next one rather than being pushed to its left.
 */
.pro-table__search-actions {
  display: flex;
  grid-column: -2 / -1;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;

  /* Arco spaces adjacent buttons itself, which leaves this run unevenly
     spaced -- its 12px between the two it recognises, the declared 8px around
     the toggle. The gap above is meant to be the only spacing here. */
  :deep(.arco-btn + .arco-btn) { margin-left: 0; }
}

.pro-table__search-caret {
  margin-left: 2px;
  transition: transform 0.2s ease;

  &.is-open { transform: rotate(180deg); }
}

/*
 * A filter wide enough to need two columns -- a date range with times in it is
 * about 340px before the label. Pages ask for this on the form-item; how much
 * they get is the grid's to say, since it is the only side that knows whether
 * there are two columns to give. (`span 1`, where a one-column panel lands, is
 * the same placement as no rule at all.)
 */
.pro-table__search :deep(.arco-form-item.is-wide) {
  grid-column: span var(--wide-span);
}

/*
 * Edge to edge on a phone: the data card is the whole viewport there, so its
 * border and radius frame the content against nothing.
 */
@media (max-width: 767px) {
  .pro-table__data-panel {
    border: 0;
    border-radius: 0;
  }
}
/*
 * The floating action button.
 *
 * Fixed to the viewport rather than the list, so it stays reachable while the
 * list scrolls. 56px is the Material size and comfortably past the 44px iOS
 * minimum; bottom-right is where a thumb rests on a phone held in either hand.
 */
.pro-table__fab {
  position: fixed;
  right: 16px;
  bottom: 24px;
  z-index: 100;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.pro-table__fab-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  color: #fff;
  cursor: pointer;
  background: var(--ga-brand, #1677ff);
  border: none;
  border-radius: 50%;
  box-shadow: 0 4px 12px rgb(0 0 0 / 18%);
  transition: transform 0.2s ease;

  .arco-icon { font-size: 24px; }

  &.is-open { transform: rotate(45deg); }
}

.pro-table__fab-menu {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
  padding: 8px;
  background: var(--ga-bg-container, #fff);
  border: 1px solid var(--ga-border-light, #0505050f);
  border-radius: 10px;
  box-shadow: 0 6px 20px rgb(0 0 0 / 12%);

  // The page's own buttons, restacked. Arco lays sibling buttons out
  // in a row with a left margin; here each one is a full-width menu entry.
  :deep(.arco-btn) {
    justify-content: flex-start;
    min-width: 120px;
    min-height: 40px;
    margin: 0 !important;
  }
}

.pro-table__fab-refresh { justify-content: flex-start; }

// Clears the button so it never covers the last card.
@media (max-width: 767px) {
  .pro-table__data { padding-bottom: 72px; }
}

/*
 * The filter sheet.
 *
 * label-position: top rather than left -- a left label column costs horizontal
 * room the controls need, and stacked labels are what a phone form looks like.
 */
:global(.pro-table__sheet) {
  border-radius: 16px 16px 0 0;

  .arco-drawer-body { padding: 0 16px 16px; }
}

.pro-table__sheet-grip {
  width: 36px;
  height: 4px;
  margin: 8px auto 12px;
  background: var(--ga-border, #d9d9d9);
  border-radius: 2px;
}

.pro-table__sheet-form {
  :deep(.arco-form-item) { margin-bottom: 14px; }

  /* No !important: the pages no longer set a width on their search controls,
     and Arco's own widths are a single class each. */
  :deep(.arco-input-wrapper),
  :deep(.arco-select-view),
  :deep(.arco-tree-select),
  :deep(.arco-picker) { width: 100%; }
}

.pro-table__sheet-actions {
  display: flex;
  gap: 10px;
  padding-top: 4px;

  :deep(.arco-btn) {
    flex: 1;
    min-height: 44px;
    margin: 0;
  }
}

.pro-table__filter-bar {
  display: flex;
  justify-content: flex-start;
  padding-bottom: 8px;
  margin-bottom: 8px;
  border-bottom: 1px solid var(--ga-border-light);
}

.pro-table__filter-icon { margin-right: 4px; }

/*
 * The toolbar sits on the right, over the table's right edge, where the row
 * actions and the pager also are. Left-aligned it started a second column of
 * interaction on a page that already has one, and the refresh button was
 * stranded on the far side of it.
 */
.pro-table__toolbar {
  display: flex;
  align-items: center;
  /*
   * row-reverse rather than reordering the markup. Pages declare their toolbar
   * most-important-first -- add, then edit, then delete -- which is the order
   * Tab and a screen reader should follow, and the order 27 pages already
   * write. Visually the run reads toward the right edge, so the primary action
   * belongs at that end; reversing here puts it there without moving it in the
   * DOM or asking every page to rewrite its slot backwards.
   *
   * justify-content: flex-start with the row reversed packs the row against
   * the right -- the main axis now runs right to left.
   */
  flex-direction: row-reverse;
  justify-content: flex-start;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.pro-table__toolbar :deep(.pro-table__refresh) {
  flex-shrink: 0;
  /*
   * Last in the markup, which the reversed row would otherwise put at the far
   * left -- adrift from the buttons it belongs beside. A negative order pulls
   * it back to the start of the reversed line, i.e. the right-hand end of the
   * run, leaving the primary action against the table's edge and refresh just
   * inside it.
   */
  order: -1;
  /* It re-reads what is on screen rather than changing it, so it sits slightly
     apart from the actions instead of in the same run. */
  margin-left: 4px;
}

/* a-table renders the cell, so this needs :deep to reach it. Lives with the
   component that emits the class rather than in the global stylesheet. */
.pro-table :deep(.pro-table__actions .cell) {
  white-space: nowrap;
}
</style>

<style scoped>
.pro-table__search-panel { margin-bottom: 12px; }
.pro-table__toolbar { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
.pro-table__refresh { margin-left: auto; }
.pro-table__actions { display: flex; align-items: center; gap: 4px; white-space: nowrap; }
</style>
