<template>
  <div class="app-wrapper shell" :class="{ 'is-mobile': app.mobile, 'is-fixed-width': preferences.contentWidth === 'fixed' }" :style="shellStyle">
    <div v-if="app.mobile && app.drawerOpen" class="shell__scrim" @click="app.closeDrawer()" />
    <AppSidebar v-if="!horizontal" />
    <div class="shell__main main-container">
      <header class="shell__header">
        <AppHeader />
        <AppTabBar v-if="preferences.tabBar && !app.mobile" />
      </header>
      <main id="app-content" class="shell__content app-main">
        <RouterViewKeepAlive :transition="preferences.pageTransition ? 'fade-transform' : undefined" />
      </main>
    </div>
    <CommandPalette />
    <GlobalSetting />
  </div>
</template>

<script setup lang="ts">
/**
 * The application shell: rail, header, tabs, content.
 *
 * This file only composes. State lives in useShell (viewport, rail width),
 * useTabs (open pages) and useShortcuts; each piece of chrome is its own
 * component under ./components.
 */
import { computed, defineAsyncComponent, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import AppHeader from './components/AppHeader.vue'
import AppSidebar from './components/AppSidebar.vue'
import AppTabBar from './components/AppTabBar.vue'
import CommandPalette from './components/CommandPalette.vue'
import RouterViewKeepAlive from './components/RouterViewKeepAlive.vue'
import { routeTitle } from '@/lang/backend'
import getPageTitle from '@/utils/get-page-title'
import { useShell, watchViewport } from './composables/useShell'
import { useShortcuts } from './composables/useShortcuts'

// Only needed once someone opens it; it carries the colour picker and the lock dialog.
const GlobalSetting = defineAsyncComponent(() => import('@/components/global-setting/index.vue'))

defineOptions({ name: 'AppLayout' })

const route = useRoute()
const { locale } = useI18n()
const { app, preferences, horizontal, collapsed } = useShell()
watchViewport()
useShortcuts()

const shellStyle = computed(() => {
  const rail = horizontal.value || app.mobile ? '0px' : collapsed.value ? 'var(--motor-rail-collapsed-width)' : `${preferences.menuWidth}px`
  return { '--shell-rail-width': rail, '--shell-menu-width': `${preferences.menuWidth}px` }
})

watch([() => route.fullPath, () => preferences.dynamicTitle, locale], () => {
  document.title = getPageTitle(preferences.dynamicTitle ? routeTitle(route) : '')
}, { immediate: true })
</script>

<style lang="scss" scoped>
.shell {
  min-height: 100%;

  &__main {
    display: flex;
    min-height: 100vh;
    flex-direction: column;
    margin-left: var(--shell-rail-width);
    transition: margin-left var(--motor-duration) var(--motor-ease);
  }

  // Above a table's fixed columns (Arco stacks those at 10), below the rail.
  &__header { position: sticky; top: 0; z-index: 90; }

  &__content {
    position: relative;
    min-height: 0;
    flex: 1;
    background: var(--motor-app-bg);
    // A page's negative gutters must not widen the document. `clip`, not
    // `hidden`: hidden would make this a scroll container and stop a sticky
    // aside from following the viewport.
    overflow-x: clip;
  }

  &.is-fixed-width &__content > :deep(*) { max-width: 1280px; margin-inline: auto; }

  &__scrim { position: fixed; inset: 0; z-index: 1000; background: rgb(0 0 0 / 40%); }
}
</style>
