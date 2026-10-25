<template>
  <div class="app-wrapper motor-layout" :class="classes" :style="layoutStyle">
    <div v-if="mobile && app.sidebar.opened" class="drawer-bg" @click="app.closeSideBar({ withoutAnimation: false })" />
    <aside v-if="showSidebar" class="sidebar-container" :class="[`rail-${settings.themeStyle}`, { 'dark-children': preferences.semiDarkSidebarChildren }]" @mouseenter="hover(true)" @mouseleave="hover(false)">
      <Sidebar id="app-navigation" :inert="mobile && !app.sidebar.opened ? true : undefined" />
      <button v-if="preferences.sidebarShowCollapseButton && !mobile" class="sidebar-collapse" :aria-label="$t('layout.toggleSidebar')" @click="toggleSidebar"><icon-menu-fold v-if="app.sidebar.opened" /><icon-menu-unfold v-else /></button>
      <div
        v-if="preferences.sidebarDraggable && app.sidebar.opened && !mobile"
        class="sidebar-resizer"
        role="separator"
        tabindex="0"
        aria-orientation="vertical"
        :aria-valuenow="preferences.menuWidth"
        :aria-valuemin="180"
        :aria-valuemax="360"
        :aria-label="$t('settings.layout.sidebar.width')"
        @pointerdown="startResize"
        @keydown.left.prevent="resizeBy(-8)"
        @keydown.right.prevent="resizeBy(8)"
      />
    </aside>
    <div class="main-container">
      <header v-if="!fullscreen" class="shell-header" :class="{ 'semi-dark-header': preferences.semiDarkHeader }">
        <Navbar v-if="preferences.headerVisible" :settings-open="preferences.globalSettings" @open-settings="openPreferences" />
        <TagsView v-if="preferences.tabBar && !mobile" @maximize="maximized = true" />
      </header>
      <AppMain />
      <Footer v-if="preferences.footerVisible" :class="{ 'footer-fixed': preferences.footerFixed }" />
    </div>
    <button v-if="!preferences.headerVisible || fullscreen" class="preferences-recovery" :aria-label="$t('settings.title')" @click="openPreferences"><icon-settings /></button>
    <button v-if="maximized" class="maximize-recovery" :aria-label="$t('settings.layout.contentFullscreen')" @click="maximized = false"><icon-fullscreen-exit /></button>
    <GlobalSetting />
    <WatermarkOverlay v-if="preferences.watermarkEnabled" class="app-watermark" />
  </div>
</template>
<script setup lang="ts">
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/stores/app'
import { useSettingsStore } from '@/stores/settings'
import { usePreferencesStore } from '@/stores/preferences'
import { useLockScreenStore } from '@/stores/lock-screen'
import { useTagsViewStore } from '@/stores/tagsView'
import { useUserStore } from '@/stores/user'
import { confirmAction } from '@/utils/modal'
import { routeTitle } from '@/lang/backend'
import getPageTitle from '@/utils/get-page-title'
import AppMain from './components/AppMain.vue'
import Navbar from './components/Navbar.vue'
import Sidebar from './components/Sidebar/index.vue'
import TagsView from './components/TagsView/index.vue'
import Footer from '@/components/footer/index.vue'
import WatermarkOverlay from '@/components/watermark-overlay/index.vue'
const GlobalSetting = defineAsyncComponent(() => import('@/components/global-setting/index.vue'))
const app = useAppStore()
const settings = useSettingsStore()
const preferences = usePreferencesStore()
const lock = useLockScreenStore()
const route = useRoute()
const router = useRouter()
const { t, locale } = useI18n()
const maximized = ref(false)
const hovered = ref(false)
const mobile = computed(() => app.device === 'mobile')
const fullscreen = computed(() => maximized.value || preferences.layoutMode === 'content-fullscreen')
const showSidebar = computed(() => !fullscreen.value && (mobile.value || (preferences.sidebarVisible && preferences.layoutMode === 'vertical')))
const railWidth = computed(() => !showSidebar.value || mobile.value ? 0 : app.sidebar.opened ? preferences.menuWidth : 54)
const layoutStyle = computed(() => ({ '--shell-rail-width': `${railWidth.value}px`, '--shell-menu-width': `${preferences.menuWidth}px` }))
const classes = computed(() => ({ mobile: mobile.value, hideSidebar: !app.sidebar.opened, openSidebar: app.sidebar.opened, 'content-fixed': preferences.contentWidth === 'fixed' }))
const openPreferences = () => preferences.updateSettings({ globalSettings: true }, false)
const toggleSidebar = () => { app.toggleSideBar(); preferences.updateSettings({ menuCollapse: !app.sidebar.opened }) }
const hover = (enter: boolean) => {
  if (mobile.value || !preferences.sidebarHoverExpand) return
  if (enter && preferences.menuCollapse) { hovered.value = true; app.sidebar.opened = true }
  if (!enter && hovered.value) { hovered.value = false; app.sidebar.opened = false }
}
const resizeBy = (delta: number) => preferences.updateSettings({ menuWidth: Math.min(360, Math.max(180, preferences.menuWidth + delta)) })
let endResize: (() => void) | undefined
const startResize = (event: PointerEvent) => {
  event.preventDefault()
  endResize?.()
  const move = (moveEvent: PointerEvent) => preferences.updateSettings({ menuWidth: Math.round(Math.min(360, Math.max(180, moveEvent.clientX))) })
  endResize = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', endResize!); window.removeEventListener('pointercancel', endResize!) }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', endResize, { once: true })
  window.addEventListener('pointercancel', endResize, { once: true })
}
const resize = () => {
  const device = window.innerWidth < 992 ? 'mobile' : 'desktop'
  if (device !== app.device && device === 'mobile') app.closeSideBar({ withoutAnimation: true })
  app.toggleDevice(device)
  preferences.updateSettings({ device }, false)
}
watch(() => route.fullPath, () => {
  if (mobile.value) app.closeSideBar({ withoutAnimation: false })
  if (preferences.tabHistory && !route.path.startsWith('/redirect')) {
    const tags = useTagsViewStore()
    tags.recentVisits = [{ path: route.path, fullPath: route.fullPath, name: String(route.name || ''), meta: { ...route.meta }}, ...tags.recentVisits.filter(view => view.fullPath !== route.fullPath)].slice(0, 12)
  }
}, { immediate: true })
watch([() => route.fullPath, () => preferences.dynamicTitle, locale], () => { document.title = getPageTitle(preferences.dynamicTitle ? routeTitle(route) : '') }, { immediate: true })
const shortcuts = async(event: KeyboardEvent) => {
  if (!preferences.shortcutEnabled || lock.locked || event.repeat) return
  const target = event.target as HTMLElement
  if (target.closest('input, textarea, select, [contenteditable="true"]')) return
  const key = event.code
  if (key === 'Comma' && (event.metaKey || event.ctrlKey) && preferences.shortcutPreferences) { event.preventDefault(); openPreferences() }
  if (key === 'KeyL' && event.altKey && preferences.shortcutLockScreen) { event.preventDefault(); if (!lock.lock()) { openPreferences(); window.dispatchEvent(new CustomEvent('motor:preferences-tab', { detail: 'extensions' })) } }
  if (key === 'KeyQ' && event.altKey && preferences.shortcutLogout) { event.preventDefault(); try { await confirmAction({ content: t('layout.logoutConfirm'), okText: t('layout.logout') }); await useUserStore().LogOut(); await router.replace('/login') } catch { /* Cancel or reported API error. */ } }
  if (key === 'Escape' && !preferences.globalSettings && !document.querySelector('.arco-modal-wrapper, .arco-drawer-container') && preferences.shortcutCloseTab && !route.meta.affix) { event.preventDefault(); const tabs = useTagsViewStore(); tabs.delView(route); await router.push(tabs.visitedViews.at(-1)?.fullPath || '/') }
}
onMounted(() => { resize(); window.addEventListener('resize', resize); window.addEventListener('keydown', shortcuts) })
onBeforeUnmount(() => { endResize?.(); window.removeEventListener('resize', resize); window.removeEventListener('keydown', shortcuts) })
</script>
<style lang="scss">
#app .motor-layout {
  min-height: 100%;
  .main-container { margin-left: var(--shell-rail-width); min-height: 100vh; display: flex; flex-direction: column; }
  .sidebar-container { width: var(--shell-rail-width); overflow: visible; display: flex; flex-direction: column; }
  .sidebar-container > #app-navigation { flex: 1; min-height: 0; overflow: hidden; }
  .sidebar-scroll { height: calc(100% - 54px); }
  .shell-header { position: sticky; top: 0; z-index: 90; }
  .app-main { min-height: 0; flex: 1; padding-top: 0; }
  .app-footer { padding: 12px; background: var(--motor-surface); }
  .footer-fixed { position: sticky; bottom: 0; z-index: 8; }
  .sidebar-collapse { width: 100%; height: 36px; border: 0; border-top: 1px solid var(--rail-border); background: var(--rail-bg); color: var(--rail-text); cursor: pointer; }
  .sidebar-resizer { position: absolute; top: 0; bottom: 0; right: -3px; width: 6px; cursor: col-resize; z-index: 3; }
  .sidebar-resizer:hover, .sidebar-resizer:focus-visible { background: var(--motor-primary); }
  .semi-dark-header { --ga-bg-container: #191c20; --ga-text-1: #f1f3f5; --ga-text-2: #c9cdd4; --ga-border-light: #30343a; --motor-surface: #191c20; --motor-text-1: #f1f3f5; --motor-text-2: #c9cdd4; --motor-surface-hover: #292d33; }
  .dark-children .arco-menu-inline-content { background: #191c20; color: #c9cdd4; }
  .dark-children .arco-menu-inline-content .arco-menu-item { color: #c9cdd4; }
  &.content-fixed .app-main > * { max-width: 1280px; margin-inline: auto; }
  &.mobile .sidebar-container { width: var(--shell-menu-width); }
  &.mobile.hideSidebar .sidebar-container { transform: translateX(-100%); }
}
.drawer-bg { position: fixed; inset: 0; background: rgb(0 0 0 / 35%); z-index: 1000; }
.preferences-recovery, .maximize-recovery { position: fixed; right: 16px; bottom: 64px; width: 44px; height: 44px; z-index: 100; border: 1px solid var(--motor-border); border-radius: var(--motor-radius-sm); background: var(--motor-surface); color: var(--motor-primary); cursor: pointer; }
.maximize-recovery { bottom: 114px; }
.app-watermark { position: fixed !important; z-index: 80 !important; }
</style>
