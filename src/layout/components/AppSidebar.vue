<template>
  <aside
    class="app-sidebar sidebar-container"
    :class="[preferences.semiDarkSidebar ? 'rail-dark' : 'rail-light', { 'is-collapsed': collapsed, 'is-drawer': app.mobile, 'is-open': app.drawerOpen }]"
    :inert="app.mobile && !app.drawerOpen ? true : undefined"
  >
    <router-link class="app-sidebar__brand" to="/" :title="appName">
      <Brand :compact="collapsed" :name="appName" :logo="system.info?.sys_app_logo" />
    </router-link>
    <nav id="app-navigation" class="app-sidebar__menu" :aria-label="$t('layout.navigation')">
      <a-menu :selected-keys="[activeMenu]" :collapsed="collapsed" :collapsed-width="RAIL_COLLAPSED" accordion auto-open-selected>
        <SidebarItem v-for="item in permission.sidebarRouters" :key="item.path" :item="item" :base-path="item.path" />
      </a-menu>
    </nav>
    <div
      v-if="!collapsed && !app.mobile"
      class="app-sidebar__resizer"
      role="separator"
      tabindex="0"
      aria-orientation="vertical"
      :aria-valuenow="preferences.menuWidth"
      :aria-valuemin="MENU_WIDTH_RANGE[0]"
      :aria-valuemax="MENU_WIDTH_RANGE[1]"
      :aria-label="$t('settings.layout.sidebar.width')"
      @pointerdown="startResize"
      @keydown.left.prevent="resizeBy(-8)"
      @keydown.right.prevent="resizeBy(8)"
    />
  </aside>
</template>

<script setup lang="ts">
/**
 * The navigation rail: brand, menu, and a draggable edge.
 *
 * One element in three states. Expanded and collapsed on a desktop; on a phone
 * it is a drawer that slides over the page, and is `inert` while closed so its
 * links are not reachable behind the content.
 *
 * The menu is Arco's, drawn on the rail's own surface: the --rail-* tokens say
 * whether that surface is light or dark, so the same rules serve both.
 */
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import Brand from '@/components/brand/index.vue'
import SidebarItem from './SidebarItem.vue'
import { resolveAppName } from '@/config/app-meta'
import { usePermissionStore } from '@/stores/permission'
import { MENU_WIDTH_RANGE } from '@/stores/preferences'
import { useSystemStore } from '@/stores/system'
import { useShell } from '../composables/useShell'

defineOptions({ name: 'AppSidebar' })

/** Collapsed rail width, in px. Matches --motor-rail-collapsed-width. */
const RAIL_COLLAPSED = 56

const route = useRoute()
const permission = usePermissionStore()
const system = useSystemStore()
const { app, preferences, collapsed, resizeBy, startResize } = useShell()

const appName = computed(() => resolveAppName(system.info?.sys_app_name))
/** A detail page can name the menu entry it belongs under with `meta.activeMenu`. */
const activeMenu = computed(() => String(route.meta.activeMenu || route.path))
</script>

<style lang="scss" scoped>
.app-sidebar {
  position: fixed;
  inset: 0 auto 0 0;
  z-index: 100;
  display: flex;
  width: var(--shell-rail-width);
  flex-direction: column;
  background: var(--rail-bg);
  border-right: 1px solid var(--rail-border);
  transition: width var(--motor-duration) var(--motor-ease);

  &__brand {
    display: flex;
    height: var(--motor-header-height);
    flex: 0 0 auto;
    align-items: center;
    padding: 0 16px;
    overflow: hidden;

    :deep(.brand) { --brand-mark-size: 28px; }
    :deep(.brand__name) { color: var(--rail-text-strong); }
  }

  &.is-collapsed &__brand { justify-content: center; padding: 0; }

  &__menu {
    min-height: 0;
    flex: 1;
    padding: 4px 0 12px;
    overflow: hidden auto;
  }

  &__resizer {
    position: absolute;
    inset: 0 -3px 0 auto;
    z-index: 1;
    width: 6px;
    cursor: col-resize;
    transition: background-color var(--motor-duration);

    &:hover,
    &:focus-visible { background: var(--motor-primary); outline: none; }
  }

  &.is-drawer {
    z-index: 1001;
    width: min(var(--shell-menu-width), 86vw);
    box-shadow: var(--motor-shadow-md);
    transform: translateX(-100%);
    transition: transform var(--motor-duration) var(--motor-ease);

    &.is-open { transform: none; }
  }
}

/*
 * Arco's menu, repainted with the rail tokens.
 *
 * Arco colours a menu by theme class (.arco-menu-light / -dark) with fixed
 * backgrounds on every item. Here the rail owns the surface, so items are
 * transparent until hovered or selected, and one set of rules covers the light
 * and the dark rail.
 */
.app-sidebar :deep(.arco-menu) {
  width: 100%;
  background: transparent;

  .arco-menu-inner { padding: 0 8px; overflow: visible; }

  .arco-menu-item,
  .arco-menu-inline-header,
  .arco-menu-pop-header {
    position: relative;
    display: flex;
    align-items: center;
    margin-bottom: 2px;
    border-radius: 6px;
    background: transparent;
    color: var(--rail-text);
    line-height: 38px;

    .arco-icon,
    .arco-menu-icon,
    .arco-menu-icon-suffix { color: inherit; }

    &:hover { background: var(--rail-hover); color: var(--rail-text-strong); }
  }

  .arco-menu-inline-content { background: transparent; }

  // The branch holding the current page: named, not filled.
  .arco-menu-inline-header.arco-menu-selected,
  .arco-menu-pop-header.arco-menu-selected { color: var(--rail-text-strong); font-weight: 500; }

  .arco-menu-item.arco-menu-selected {
    background: var(--rail-active-bg);
    color: var(--rail-active-text);
    font-weight: 500;

    &::before {
      position: absolute;
      top: 50%;
      left: 0;
      width: 3px;
      height: 16px;
      border-radius: 0 2px 2px 0;
      background: var(--rail-active-text);
      content: '';
      transform: translateY(-50%);
    }
  }

  .arco-menu-title { overflow: hidden; }
  .menu-title { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  // Collapsed: icons only, centred on the rail.
  &.arco-menu-collapsed {
    .arco-menu-item,
    .arco-menu-pop-header { justify-content: center; padding: 0; }
    .arco-menu-icon { margin-right: 0; padding: 0; }
    .arco-menu-icon-suffix { display: none; }
  }
}
</style>
