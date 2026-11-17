<template>
  <div class="app-header navbar">
    <div class="app-header__start">
      <HeaderIconButton
        v-if="!horizontal"
        id="hamburger-container"
        :tooltip="$t(navigationOpen ? 'layout.collapseNavigation' : 'layout.expandNavigation')"
        :aria-expanded="navigationOpen"
        aria-controls="app-navigation"
        @click="toggleNavigation"
      >
        <icon-menu-fold v-if="navigationOpen" /><icon-menu-unfold v-else />
      </HeaderIconButton>
      <router-link v-if="horizontal || app.mobile" class="app-header__brand" to="/" :title="appName">
        <Brand :compact="app.mobile" :name="appName" :logo="system.info?.sys_app_logo" />
      </router-link>
      <a-menu v-if="horizontal" mode="horizontal" :selected-keys="[route.path]" class="app-header__menu">
        <SidebarItem v-for="item in permission.sidebarRouters" :key="item.path" :item="item" :base-path="item.path" />
      </a-menu>
      <AppBreadcrumb v-else-if="!app.mobile" />
    </div>
    <div class="app-header__end">
      <button id="header-search" type="button" class="app-header__search" :aria-label="$t('navbar.search.title')" @click="openCommandPalette">
        <icon-search />
        <span class="app-header__search-text">{{ $t('navbar.search.title') }}</span>
        <kbd v-if="preferences.shortcutEnabled" class="app-header__kbd">{{ keyLabel('Mod') }} K</kbd>
      </button>
      <LangSelect id="lang-select" />
      <HeaderIconButton
        id="theme-toggle"
        :tooltip="$t(preferences.darkMode ? 'settings.navbar.theme.toLight' : 'settings.navbar.theme.toDark')"
        @click="preferences.toggleTheme()"
      >
        <icon-sun-fill v-if="preferences.darkMode" /><icon-moon-fill v-else />
      </HeaderIconButton>
      <UserMenu />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * The top bar: where you are on the left, the few always-needed controls on
 * the right. Everything else about the session lives in the account menu.
 */
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import Brand from '@/components/brand/index.vue'
import HeaderIconButton from '@/components/header-icon-button/index.vue'
import LangSelect from '@/components/LangSelect/index.vue'
import AppBreadcrumb from './AppBreadcrumb.vue'
import SidebarItem from './SidebarItem.vue'
import UserMenu from './UserMenu.vue'
import { resolveAppName } from '@/config/app-meta'
import { usePermissionStore } from '@/stores/permission'
import { useSystemStore } from '@/stores/system'
import { openCommandPalette } from '../composables/useCommandPalette'
import { keyLabel } from '../composables/useShortcuts'
import { useShell } from '../composables/useShell'

defineOptions({ name: 'AppHeader' })

const route = useRoute()
const permission = usePermissionStore()
const system = useSystemStore()
const { app, preferences, horizontal, navigationOpen, toggleNavigation } = useShell()
const appName = computed(() => resolveAppName(system.info?.sys_app_name))
</script>

<style lang="scss" scoped>
.app-header {
  display: flex;
  height: var(--motor-header-height);
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 16px 0 8px;
  background: var(--motor-surface);
  border-bottom: 1px solid var(--motor-border-soft);
  color: var(--motor-text-2);

  &__start,
  &__end { display: flex; min-width: 0; align-items: center; gap: 4px; }
  &__start { flex: 1; gap: 8px; }
  &__end { flex-shrink: 0; }

  &__brand { display: flex; align-items: center; padding: 0 8px; :deep(.brand) { --brand-mark-size: 28px; } }
  &__menu { min-width: 0; flex: 1; background: transparent; }

  :deep(.header-action) { font-size: var(--motor-navigation-icon-size); }
  :deep(.header-action.arco-btn-text:not(.arco-btn-disabled)) { color: inherit; }

  // Reads as a field, so it invites typing; it is a button that opens the palette.
  &__search {
    display: flex;
    height: 32px;
    min-width: 200px;
    align-items: center;
    gap: 8px;
    padding: 0 8px 0 10px;
    margin-right: 4px;
    border: 1px solid transparent;
    border-radius: var(--motor-radius-sm);
    background: var(--motor-surface-hover);
    color: var(--motor-text-3);
    font-size: var(--motor-font-size-13);
    cursor: pointer;
    transition: border-color var(--motor-duration), background-color var(--motor-duration);

    &:hover { border-color: var(--motor-border); background: var(--motor-surface); }
  }

  &__search-text { flex: 1; text-align: left; }

  &__kbd {
    padding: 1px 6px;
    border: 1px solid var(--motor-border);
    border-radius: 4px;
    background: var(--motor-surface);
    color: var(--motor-text-3);
    font-family: inherit;
    font-size: var(--motor-font-size-11);
    line-height: 1.5;
  }
}

@media (max-width: 991px) {
  .app-header { padding: 0 8px; gap: 4px; }
  .app-header__search { min-width: 0; width: 36px; justify-content: center; padding: 0; margin: 0; background: transparent; color: inherit; font-size: var(--motor-navigation-icon-size); }
  .app-header__search-text,
  .app-header__kbd { display: none; }
}
</style>
