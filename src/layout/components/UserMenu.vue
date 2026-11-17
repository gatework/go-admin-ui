<template>
  <AppDropdown trigger="click" position="br" :popup-max-height="false" @select="run">
    <button ref="trigger" type="button" class="user-menu__trigger avatar-wrapper" :aria-label="$t('layout.accountMenu')">
      <UserIdentity :name="user.name" :avatar-url="user.avatar" :size="28" avatar-only />
      <span class="user-menu__name">{{ user.name }}</span>
      <icon-down class="user-menu__caret" />
    </button>
    <template #content>
      <div class="user-menu__head">
        <UserIdentity :name="user.name" :avatar-url="user.avatar" :subtitle="user.roles.join(', ')" />
      </div>
      <a-doption v-for="item in items" :key="item.key" :value="item.key">
        <template #icon><component :is="item.icon" /></template>
        {{ $t(item.label) }}
      </a-doption>
    </template>
  </AppDropdown>
</template>

<script setup lang="ts">
/**
 * The account menu: everything about "me and this session" in one place, so the
 * header keeps only the controls used many times an hour.
 */
import { computed, onBeforeUnmount, onMounted, ref, type Component } from 'vue'
import { useRouter } from 'vue-router'
import screenfull from 'screenfull'
import { IconExport, IconFullscreen, IconFullscreenExit, IconLock, IconSettings, IconTool, IconUser } from '@arco-design/web-vue/es/icon'
import AppDropdown from '@/components/AppDropdown/index.vue'
import UserIdentity from '@/components/user-identity/index.vue'
import { useAppStore } from '@/stores/app'
import { usePreferencesStore } from '@/stores/preferences'
import { useUserStore } from '@/stores/user'
import { useLockNow } from '../composables/useLockNow'
import { useLogout } from '../composables/useLogout'

defineOptions({ name: 'UserMenu' })

interface MenuAction { key: string, label: string, icon: Component, run: () => unknown }

const router = useRouter()
const app = useAppStore()
const user = useUserStore()
const preferences = usePreferencesStore()
const lockNow = useLockNow()
const logout = useLogout()

const fullscreen = ref(false)
const syncFullscreen = () => { fullscreen.value = screenfull.isFullscreen }
onMounted(() => { if (screenfull.isEnabled) screenfull.on('change', syncFullscreen) })
onBeforeUnmount(() => { if (screenfull.isEnabled) screenfull.off('change', syncFullscreen) })

/** The system-configuration page, when this account's menu includes it. */
const systemConfig = computed(() => router.getRoutes().find(item => item.name === 'SysConfigSet')?.path)

const items = computed<MenuAction[]>(() => [
  { key: 'profile', label: 'navbar.account', icon: IconUser, run: () => router.push('/profile/index') },
  { key: 'preferences', label: 'settings.title', icon: IconSettings, run: () => preferences.openSettings() },
  ...(systemConfig.value ? [{ key: 'system', label: 'navbar.systemConfig', icon: IconTool, run: () => router.push(systemConfig.value!) }] : []),
  ...(screenfull.isEnabled && !app.mobile
    ? [{
      key: 'fullscreen',
      label: fullscreen.value ? 'layout.exitFullscreen' : 'layout.enterFullscreen',
      icon: fullscreen.value ? IconFullscreenExit : IconFullscreen,
      run: () => screenfull.toggle().catch(syncFullscreen)
    }]
    : []),
  { key: 'lock', label: 'settings.lock.now', icon: IconLock, run: lockNow },
  { key: 'logout', label: 'layout.logout', icon: IconExport, run: logout }
])

const trigger = ref<HTMLElement>()
/**
 * Focus goes back to the trigger before the action runs. A dialog remembers
 * what had focus when it opened so it can return there on close; left on the
 * menu item, that would be an element the closing menu has already removed.
 */
const run = (key: unknown) => {
  trigger.value?.focus()
  void items.value.find(item => item.key === key)?.run()
}
</script>

<style lang="scss" scoped>
.user-menu__trigger {
  display: flex;
  max-width: 200px;
  height: 36px;
  align-items: center;
  gap: 8px;
  padding: 0 8px 0 4px;
  border: 0;
  border-radius: 18px;
  background: transparent;
  color: var(--motor-text-1);
  cursor: pointer;
  transition: background-color var(--motor-duration);

  &:hover { background: var(--motor-surface-hover); }
}

.user-menu__name {
  overflow: hidden;
  font-size: var(--motor-font-size-14);
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-menu__caret { flex-shrink: 0; color: var(--motor-text-3); font-size: 12px; }

.user-menu__head {
  min-width: 200px;
  max-width: 280px;
  padding: 12px 14px;
  margin-bottom: 4px;
  border-bottom: 1px solid var(--motor-border-soft);
}

@media (max-width: 991px) {
  .user-menu__trigger { padding: 0 4px; }
  .user-menu__name,
  .user-menu__caret { display: none; }
}
</style>
