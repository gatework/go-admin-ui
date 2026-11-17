<template>
  <AppModal
    v-model:visible="commandPaletteOpen"
    :title="$t('navbar.search.title')"
    :footer="false"
    :hide-title="true"
    :closable="false"
    :width="560"
    :align-center="false"
    modal-class="command-palette"
  >
    <div class="command-palette__body" @keydown="onKeydown">
      <a-input
        ref="input"
        v-model="query"
        size="large"
        allow-clear
        :placeholder="$t('navbar.search.placeholder')"
        :input-attrs="{ 'aria-label': $t('navbar.search.title'), role: 'combobox', 'aria-expanded': 'true', 'aria-controls': listId, 'aria-activedescendant': results[active] ? `${listId}-${active}` : undefined }"
      >
        <template #prefix><icon-search /></template>
      </a-input>
      <ul v-if="results.length" :id="listId" ref="list" class="command-palette__list" role="listbox">
        <li
          v-for="(item, index) in results"
          :id="`${listId}-${index}`"
          :key="item.path"
          role="option"
          :aria-selected="index === active"
          class="command-palette__item"
          :class="{ 'is-active': index === active }"
          @mousemove="active = index"
          @click="open(item)"
        >
          <MenuIcon :name="item.icon" />
          <span class="command-palette__title">{{ item.titles.at(-1) }}</span>
          <span v-if="item.titles.length > 1" class="command-palette__trail">{{ item.titles.slice(0, -1).join(' / ') }}</span>
        </li>
      </ul>
      <a-empty v-else :description="$t('navbar.search.empty')" />
      <footer class="command-palette__hint">
        <span>{{ $t('navbar.search.keyboardHint') }}</span>
        <span>{{ $t('navbar.search.available', { count: pages.length }) }}</span>
      </footer>
    </div>
  </AppModal>
</template>

<script setup lang="ts">
/**
 * Menu search, opened from the header or with ⌘K / Ctrl+K.
 *
 * Lists every page this account can open. An empty query shows them all in menu
 * order, so the dialog doubles as a keyboard-driven menu; typing narrows it
 * with fuzzy matching over the title trail and the path.
 */
import { computed, nextTick, ref, useId, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Fuse from 'fuse.js'
import path from 'path'
import AppModal from '@/components/AppModal/index.vue'
import MenuIcon from '@/components/MenuIcon/index.vue'
import { routeTitle } from '@/lang/backend'
import { usePermissionStore } from '@/stores/permission'
import { isExternal } from '@/utils/validate'
import { commandPaletteOpen } from '../composables/useCommandPalette'

defineOptions({ name: 'CommandPalette' })

interface Page { path: string, titles: string[], icon?: string, search: string }
interface MenuNode { path: string, hidden?: boolean, redirect?: unknown, name?: unknown, meta?: { title?: unknown, titleKey?: unknown, icon?: unknown }, children?: MenuNode[] }

const router = useRouter()
const permission = usePermissionStore()
const { locale } = useI18n()
const listId = useId()
const input = ref<{ focus: () => void }>()
const list = ref<HTMLElement>()
const query = ref('')
const active = ref(0)

/** Flattens the menu tree into openable pages, each carrying the titles above it. */
const collect = (nodes: MenuNode[], base = '/', trail: string[] = [], icon?: string): Page[] => nodes.flatMap(node => {
  if (node.hidden || isExternal(node.path)) return []
  const full = path.resolve(base, node.path)
  const titles = node.meta?.title ? [...trail, routeTitle(node)] : trail
  const ownIcon = typeof node.meta?.icon === 'string' && node.meta.icon ? node.meta.icon : icon
  const children = collect(node.children ?? [], full, titles, ownIcon)
  // A node with children is a directory; only leaves are pages.
  if (node.children?.length || !node.meta?.title) return children
  return [{ path: full, titles, icon: ownIcon, search: titles.join(' ') }]
})

// `locale` is read so the titles are rebuilt when the language changes.
const pages = computed(() => { void locale.value; return collect(permission.sidebarRouters as unknown as MenuNode[]) })
const fuse = computed(() => new Fuse(pages.value, { threshold: 0.4, keys: [{ name: 'search', weight: 0.7 }, { name: 'path', weight: 0.3 }] }))
const results = computed(() => query.value.trim() ? fuse.value.search(query.value.trim()).map(result => result.item) : pages.value)

const reset = async() => {
  query.value = ''
  active.value = 0
  await nextTick()
  input.value?.focus()
}
const open = (page: Page) => {
  commandPaletteOpen.value = false
  void router.push(page.path)
}
const move = async(delta: number) => {
  if (!results.value.length) return
  active.value = (active.value + delta + results.value.length) % results.value.length
  await nextTick()
  list.value?.children[active.value]?.scrollIntoView({ block: 'nearest' })
}
const onKeydown = (event: KeyboardEvent) => {
  const step = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0
  if (step) {
    event.preventDefault()
    void move(step)
  } else if (event.key === 'Enter' && !event.isComposing && results.value[active.value]) {
    event.preventDefault()
    open(results.value[active.value])
  }
}
watch(query, () => { active.value = 0 })
// The modal's own `open` fires after its animation; typing should not have to wait for that.
watch(commandPaletteOpen, visible => { if (visible) void reset() })
</script>

<style lang="scss">
// Not scoped: the modal is teleported to <body>.
.command-palette {
  top: 12vh;
  overflow: hidden;

  .arco-modal-body { padding: 0; }

  &__body { display: flex; flex-direction: column; }
  &__body > .arco-input-wrapper { border: 0; border-bottom: 1px solid var(--motor-border-soft); border-radius: 0; background: transparent; box-shadow: none; }

  &__list {
    max-height: min(420px, 52vh);
    padding: 8px;
    margin: 0;
    overflow-y: auto;
    list-style: none;
  }

  &__item {
    display: flex;
    min-height: 40px;
    align-items: center;
    gap: 10px;
    padding: 0 10px;
    border-radius: 6px;
    color: var(--motor-text-2);
    cursor: pointer;

    &.is-active { background: var(--motor-primary-soft); color: var(--motor-primary); }
  }

  &__title { color: var(--motor-text-1); font-weight: 500; }
  &__item.is-active &__title { color: inherit; }
  &__trail { min-width: 0; margin-left: auto; overflow: hidden; color: var(--motor-text-3); font-size: var(--motor-font-size-12); text-overflow: ellipsis; white-space: nowrap; }

  &__hint {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 8px 14px;
    border-top: 1px solid var(--motor-border-soft);
    color: var(--motor-text-3);
    font-size: var(--motor-font-size-12);
  }

  .arco-empty { padding: 32px 0; }
}
</style>
