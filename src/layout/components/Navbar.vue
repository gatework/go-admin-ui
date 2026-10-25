<template>
  <div class="navbar header-bar">
    <div class="header-bar__left">
      <HeaderIconButton v-if="app.device === 'mobile' || preferences.layoutMode !== 'horizontal'" id="hamburger-container" :tooltip="$t('layout.toggleSidebar')" :aria-expanded="app.sidebar.opened" aria-controls="app-navigation" @click="toggleMenu"><icon-menu-fold v-if="app.sidebar.opened" /><icon-menu-unfold v-else /></HeaderIconButton>
      <Brand v-if="app.device === 'mobile' || preferences.layoutMode === 'horizontal'" class="header-brand" />
      <a-menu v-if="preferences.layoutMode === 'horizontal' && app.device !== 'mobile'" mode="horizontal" :selected-keys="[route.path]" class="horizontal-menu">
        <SidebarItem v-for="item in permission.routes" :key="item.path" :item="item" :base-path="item.path" />
      </a-menu>
      <Breadcrumb id="breadcrumb-container" v-if="preferences.breadcrumbEnabled && !preferences.tabBar && preferences.layoutMode !== 'horizontal'" />
    </div>
    <div class="header-bar__right">
      <HeaderSearch id="header-search" />
      <AppDropdown v-if="preferences.tabHistory && app.device !== 'mobile'" trigger="click">
        <HeaderIconButton :tooltip="$t('navbar.history.tooltip')"><icon-history /></HeaderIconButton>
        <template #content>
          <a-doption v-if="!tags.recentVisits.length" disabled>{{ $t('navbar.history.empty') }}</a-doption>
          <a-doption v-for="visit in tags.recentVisits" :key="visit.fullPath" @click="router.push(visit.fullPath || visit.path)">{{ routeTitle(visit) }}</a-doption>
          <a-doption v-if="tags.recentVisits.length" @click="tags.recentVisits = []">{{ $t('navbar.history.clear') }}</a-doption>
        </template>
      </AppDropdown>
      <LangSelect v-if="preferences.widgetLocale" id="lang-select" />
      <HeaderIconButton v-if="preferences.widgetTheme" :tooltip="$t(preferences.darkMode ? 'settings.navbar.theme.toLight' : 'settings.navbar.theme.toDark')" motion="pulse" @click="preferences.toggleTheme()"><icon-sun-fill v-if="preferences.darkMode" /><icon-moon-fill v-else /></HeaderIconButton>
      <Screenfull v-if="preferences.widgetFullscreen && app.device !== 'mobile'" id="screenfull" />
      <HeaderIconButton v-if="preferences.widgetLock" :tooltip="$t('settings.lock.now')" @click="lockNow"><icon-lock /></HeaderIconButton>
      <HeaderIconButton id="layout-settings" :tooltip="$t('settings.title')" :aria-expanded="settingsOpen" @click="$emit('open-settings')"><icon-settings /></HeaderIconButton>
      <AppDropdown trigger="click" position="br" :popup-max-height="false">
        <button type="button" class="user-trigger avatar-wrapper" :aria-label="$t('layout.accountMenu')"><UserIdentity :name="user.name" :avatar-url="user.avatar" :subtitle="user.roles.join(', ')" :size="32" :status-label="$t('navbar.online')" compact online /></button>
        <template #content>
          <div class="user-menu-head"><UserIdentity :name="user.name" :avatar-url="user.avatar" :subtitle="user.roles.join(', ')" :status-label="$t('navbar.online')" online /></div>
          <a-doption @click="router.push('/profile/index')"><template #icon><icon-user /></template>{{ $t('navbar.account') }}</a-doption>
          <a-doption @click="$emit('open-settings')"><template #icon><icon-settings /></template>{{ $t('settings.title') }}</a-doption>
          <a-doption v-if="systemConfig" @click="router.push(systemConfig)"><template #icon><icon-tool /></template>{{ $t('navbar.systemConfig') }}</a-doption>
          <a-doption @click="logout"><template #icon><icon-export /></template>{{ $t('layout.logout') }}</a-doption>
        </template>
      </AppDropdown>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/stores/app'
import { useUserStore } from '@/stores/user'
import { usePreferencesStore } from '@/stores/preferences'
import { useLockScreenStore } from '@/stores/lock-screen'
import { useTagsViewStore } from '@/stores/tagsView'
import { usePermissionStore } from '@/stores/permission'
import { routeTitle } from '@/lang/backend'
import { confirmAction } from '@/utils/modal'
import AppDropdown from '@/components/AppDropdown/index.vue'
import HeaderIconButton from '@/components/header-icon-button/index.vue'
import UserIdentity from '@/components/user-identity/index.vue'
import Brand from '@/components/brand/index.vue'
import Breadcrumb from '@/components/Breadcrumb/index.vue'
import SidebarItem from './Sidebar/SidebarItem.vue'
import HeaderSearch from '@/components/HeaderSearch/index.vue'
import Screenfull from '@/components/Screenfull/index.vue'
import LangSelect from '@/components/LangSelect/index.vue'
defineProps<{ settingsOpen?: boolean }>()
defineEmits<{ 'open-settings': [] }>()
const app = useAppStore(); const user = useUserStore(); const preferences = usePreferencesStore(); const lock = useLockScreenStore(); const tags = useTagsViewStore(); const permission = usePermissionStore()
const route = useRoute(); const router = useRouter(); const { t } = useI18n()
const systemConfig = computed(() => router.getRoutes().find(item => item.name === 'SysConfigSet')?.path)
const toggleMenu = () => {
  if (app.device === 'mobile') app.toggleSideBar()
  else if (!preferences.sidebarVisible) preferences.updateSettings({ sidebarVisible: true })
  else { app.toggleSideBar(); preferences.updateSettings({ menuCollapse: !app.sidebar.opened }) }
}
const lockNow = async() => {
  if (lock.lock()) return
  preferences.updateSettings({ globalSettings: true }, false)
  await nextTick()
  window.dispatchEvent(new CustomEvent('motor:preferences-tab', { detail: 'extensions' }))
}
const logout = async() => { try { await confirmAction({ content: t('layout.logoutConfirm'), okText: t('layout.logout') }); await user.LogOut(); await router.replace('/login') } catch { /* Cancel or reported API error. */ } }
</script>
<style scoped lang="scss">
.header-bar { display: flex; justify-content: space-between; align-items: center; gap: 12px; height: var(--ga-header-h); padding: 0 16px; background: var(--ga-bg-container); border-bottom: 1px solid var(--ga-border-light); }
.header-bar__left, .header-bar__right { display: flex; align-items: center; gap: 6px; min-width: 0; }
.header-bar__left { flex: 1; overflow: hidden; }
.header-bar__right { flex-shrink: 0; }
.horizontal-menu { flex: 1; min-width: 0; background: transparent; }
.user-trigger { padding: 0 4px; border: 0; background: transparent; cursor: pointer; }
.user-menu-head { padding: 14px; border-bottom: 1px solid var(--motor-border); max-width: 280px; }
@media (max-width: 991px) { .header-bar { padding: 0 8px; gap: 4px; } .header-bar__right { gap: 0; } .header-brand :deep(.brand__name), .user-trigger :deep(.user-identity__copy) { display: none; } }
</style>
