<template>
  <div id="tags-view-container" class="app-tab-bar tags-view-container" @keydown.delete="closeFocused">
    <AppTabs :active-key="activeKey" type="card-gutter" size="small" editable hide-content @change="open" @delete="closeByKey">
      <a-tab-pane v-for="tab in tabs" :key="tab.fullPath" :closable="!isAffix(tab)">
        <template #title>
          <AppDropdown trigger="contextMenu" @select="run($event as TabAction, tab)">
            <span class="app-tab-bar__tab tags-view-item" :title="routeTitle(tab)" @auxclick="middleClose($event, tab)">
              <MenuIcon v-if="tab.meta?.icon" :name="String(tab.meta.icon)" />
              <span class="app-tab-bar__label">{{ routeTitle(tab) }}</span>
            </span>
            <template #content>
              <a-doption value="refresh">{{ $t('layout.tagsView.refresh') }}</a-doption>
              <a-doption v-if="!isAffix(tab)" value="close">{{ $t('layout.tagsView.close') }}</a-doption>
              <a-doption value="others">{{ $t('layout.tagsView.closeOthers') }}</a-doption>
              <a-doption value="all">{{ $t('layout.tagsView.closeAll') }}</a-doption>
            </template>
          </AppDropdown>
        </template>
      </a-tab-pane>
    </AppTabs>
    <AppDropdown trigger="click" position="br" @select="run($event as TabAction, current)">
      <HeaderIconButton :tooltip="$t('layout.tagsView.more')"><icon-more /></HeaderIconButton>
      <template #content>
        <a-doption value="refresh">{{ $t('layout.tagsView.refresh') }}</a-doption>
        <a-doption value="others">{{ $t('layout.tagsView.closeOthers') }}</a-doption>
        <a-doption value="all">{{ $t('layout.tagsView.closeAll') }}</a-doption>
      </template>
    </AppDropdown>
  </div>
</template>

<script setup lang="ts">
/**
 * The open pages, as tabs under the header.
 *
 * Arco's tabs own the scrolling and the overflow arrows; AppTabs adds the tab
 * roles and arrow keys. A tab's title reads through routeTitle, so tabs already
 * open follow a language switch.
 */
import { computed, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import AppDropdown from '@/components/AppDropdown/index.vue'
import AppTabs from '@/components/AppTabs/index.vue'
import HeaderIconButton from '@/components/header-icon-button/index.vue'
import MenuIcon from '@/components/MenuIcon/index.vue'
import { routeTitle } from '@/lang/backend'
import type { VisitedView } from '@/stores/tagsView'
import { useTabs, type TabAction } from '../composables/useTabs'

defineOptions({ name: 'AppTabBar' })

const route = useRoute()
const { tabs, activeKey, isAffix, open, close, run } = useTabs()

/** The tab for the page on screen; the bar's own menu acts on it. */
const current = computed<VisitedView>(() => tabs.value.find(tab => tab.path === route.path) ?? { path: route.path, fullPath: route.fullPath, name: String(route.name ?? ''), meta: { ...route.meta }})

const closeByKey = (key: string | number) => {
  const tab = tabs.value.find(item => item.fullPath === key)
  if (tab) void close(tab)
}
const middleClose = (event: MouseEvent, tab: VisitedView) => {
  if (event.button !== 1 || isAffix(tab)) return
  event.preventDefault()
  void close(tab)
}
/** Delete / Backspace on a focused tab closes it and keeps focus in the bar. */
const closeFocused = async(event: KeyboardEvent) => {
  const target = event.target as HTMLElement
  if (!target.classList.contains('arco-tabs-tab')) return
  const bar = event.currentTarget as HTMLElement
  const tab = tabs.value[Array.from(bar.querySelectorAll('.arco-tabs-tab')).indexOf(target)]
  if (!tab || isAffix(tab)) return
  event.preventDefault()
  await close(tab)
  await nextTick()
  bar.querySelector<HTMLElement>('.arco-tabs-tab-active')?.focus()
}
</script>

<style lang="scss" scoped>
.app-tab-bar {
  display: flex;
  height: var(--motor-tabs-height);
  align-items: center;
  gap: 4px;
  padding: 0 8px 0 12px;
  background: var(--motor-surface);
  border-bottom: 1px solid var(--motor-border-soft);
  overflow: hidden;

  :deep(.arco-tabs) { min-width: 0; flex: 1; }
  :deep(.arco-tabs-nav::before) { display: none; }
  :deep(.arco-tabs-nav-tab) { align-items: center; }

  // Chips rather than folder tabs: the bar is a list of places, not a container.
  :deep(.arco-tabs-tab) {
    max-width: 200px;
    height: calc(var(--motor-tabs-height) - 10px);
    padding: 0 10px;
    margin: 0 4px 0 0;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: var(--motor-text-2);
    font-size: var(--motor-font-size-13);
    line-height: 1;
    transition: background-color var(--motor-duration), color var(--motor-duration);

    &:hover { background: var(--motor-surface-hover); color: var(--motor-text-1); }
  }

  :deep(.arco-tabs-tab-active),
  :deep(.arco-tabs-tab-active:hover) {
    background: var(--motor-primary-soft);
    color: var(--motor-primary);
    font-weight: 500;
  }

  :deep(.arco-tabs-tab-title) { min-width: 0; }

  // The close button appears on the tab you are pointing at or have focused.
  :deep(.arco-tabs-tab-close-btn) { display: none; flex-shrink: 0; margin-left: 4px; }
  :deep(.arco-tabs-tab:hover .arco-tabs-tab-close-btn),
  :deep(.arco-tabs-tab:focus-visible .arco-tabs-tab-close-btn) { display: inline-flex; }

  &__tab { display: inline-flex; max-width: 100%; align-items: center; gap: 6px; vertical-align: middle; }
  &__label { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
}

@media (hover: none) {
  .app-tab-bar :deep(.arco-tabs-tab-active .arco-tabs-tab-close-btn) { display: inline-flex; }
}
</style>
