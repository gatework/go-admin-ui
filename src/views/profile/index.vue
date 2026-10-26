<template>
  <PageContainer class="account-page">
    <header class="account-heading"><h1>{{ $t('account.title') }}</h1><p>{{ $t('profile.alignment.description') }}</p></header>
    <a-spin :loading="loading" class="account-loading">
      <a-alert v-if="failed" type="error"><span>{{ $t('profile.alignment.loadError') }}</span><a-button type="text" @click="load">{{ $t('common.retry') }}</a-button></a-alert>
      <div v-else class="account-workspace">
        <aside class="account-sidebar" :inert="securityProtected">
          <section class="account-hero">
            <UserAvatar :user="user" @uploaded="user.avatar = $event" />
            <div class="account-hero__copy"><h2>{{ user.nickName || user.username || session.name }}</h2><span>@{{ user.username }}</span><div><a-tag v-for="role in roleNames" :key="role" color="arcoblue">{{ role }}</a-tag></div></div>
            <span class="identity-detail">{{ user.email }}</span>
            <span v-if="user.dept?.deptName" class="identity-detail">{{ user.dept.deptName }}</span>
          </section>
          <nav class="account-navigation" role="tablist" :aria-label="$t('account.navigation.label')" aria-orientation="vertical">
            <button
              v-for="tab in tabs"
              :id="`account-tab-${tab.key}`"
              :key="tab.key"
              type="button"
              role="tab"
              :aria-selected="activeTab === tab.key"
              :aria-controls="`account-panel-${tab.key}`"
              :tabindex="activeTab === tab.key ? 0 : -1"
              :class="{ active: activeTab === tab.key }"
              @click="activeTab = tab.key"
              @keydown="navigate($event, tab.key)"
            ><component :is="tab.icon" /><span>{{ $t(tab.label) }}</span><icon-right /></button>
          </nav>
        </aside>
        <div class="account-main">
          <section id="account-panel-userinfo" role="tabpanel" :hidden="activeTab !== 'userinfo'" aria-labelledby="account-tab-userinfo" class="account-section">
            <header><h3>{{ $t('account.profile.title') }}</h3><p>{{ $t('account.profile.description') }}</p></header>
            <UserInfo v-if="user.userId" :user="user" @saved="profileSaved" />
          </section>
          <section id="account-panel-resetPwd" role="tabpanel" :hidden="activeTab !== 'resetPwd'" aria-labelledby="account-tab-resetPwd" class="account-section">
            <header><h3>{{ $t('account.security.title') }}</h3><p>{{ $t('account.security.description') }}</p></header>
            <div :inert="securityProtected"><ResetPwd /></div>
            <MFASettings v-if="securityVisited" @protected="securityProtected = $event" />
          </section>
          <section id="account-panel-preferences" role="tabpanel" :hidden="activeTab !== 'preferences'" aria-labelledby="account-tab-preferences" class="account-section">
            <header><h3>{{ $t('settings.title') }}</h3><p>{{ $t('profile.alignment.localPreferences') }}</p></header>
            <a-button type="primary" @click="preferences.updateSettings({ globalSettings: true }, false)"><template #icon><icon-settings /></template>{{ $t('settings.title') }}</a-button>
          </section>
          <p class="account-differences"><icon-info-circle /> {{ $t('profile.alignment.backendDifferences') }}</p>
        </div>
      </div>
    </a-spin>
  </PageContainer>
</template>
<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { IconUser, IconSafe, IconSettings } from '@arco-design/web-vue/es/icon'
import { getUserProfile } from '@/api/admin/sys-user'
import type { SysUser } from '@/types/admin'
import { useUserStore } from '@/stores/user'
import { usePreferencesStore } from '@/stores/preferences'
import PageContainer from '@/components/PageContainer/index.vue'
import UserAvatar from './userAvatar.vue'
import UserInfo from './userInfo.vue'
import ResetPwd from './resetPwd.vue'
import MFASettings from './components/mfa-settings.vue'
defineOptions({ name: 'Profile' })
const session = useUserStore(); const preferences = usePreferencesStore()
const user = ref<SysUser>({}); const roles = ref<{ roleId: number, roleName: string }[]>([])
const loading = ref(false); const failed = ref(false); const activeTab = ref('userinfo')
const securityProtected = ref(false); const securityVisited = ref(false)
watch(activeTab, tab => { if (tab === 'resetPwd') securityVisited.value = true })
const tabs = [{ key: 'userinfo', label: 'profile.tabs.info', icon: IconUser }, { key: 'resetPwd', label: 'profile.tabs.password', icon: IconSafe }, { key: 'preferences', label: 'settings.title', icon: IconSettings }]
const roleNames = computed(() => roles.value.filter(role => user.value.roleIds?.includes(role.roleId) || role.roleId === user.value.roleId).map(role => role.roleName))
const load = async() => {
  if (loading.value) return
  loading.value = true; failed.value = false
  try { const response = await getUserProfile(); user.value = response.data.user; roles.value = response.data.roles || [] } catch { failed.value = true } finally { loading.value = false }
}
const profileSaved = (updated: SysUser) => { user.value = { ...updated }; session.name = updated.nickName || updated.username || session.name }
const navigate = async(event: KeyboardEvent, key: string) => {
  if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return
  event.preventDefault()
  const index = tabs.findIndex(tab => tab.key === key)
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + tabs.length) % tabs.length
  activeTab.value = tabs[next].key
  await nextTick(); document.getElementById(`account-tab-${activeTab.value}`)?.focus()
}
onMounted(load)
</script>
<style scoped lang="scss">
.account-page { padding: 24px; }
.account-heading { margin-bottom: 20px; h1 { font-size: 24px; margin: 0 0 8px; } p { margin: 0; color: var(--motor-text-2); } }
.account-loading { width: 100%; }
.account-workspace { display: grid; grid-template-columns: 252px minmax(0, 1fr); align-items: start; gap: 16px; }
.account-sidebar { border: 1px solid var(--motor-border); border-radius: var(--motor-radius-lg); overflow: hidden; background: var(--motor-surface); }
.account-hero { display: flex; flex-direction: column; align-items: flex-start; gap: 16px; padding: 20px 18px; background: var(--motor-surface-soft); border-bottom: 1px solid var(--motor-border); }
.account-hero__copy { min-width: 0; h2 { margin: 0; overflow-wrap: anywhere; } > span { display: block; margin: 4px 0 9px; color: var(--motor-text-2); } > div { display: flex; flex-wrap: wrap; gap: 6px; } }
.identity-detail { max-width: 100%; overflow-wrap: anywhere; color: var(--motor-text-2); }
.account-navigation { padding: 8px; button { width: 100%; display: flex; align-items: center; gap: 10px; padding: 14px 12px; border: 0; border-radius: var(--motor-radius-sm); background: transparent; color: var(--motor-text-2); cursor: pointer; text-align: left; span { flex: 1; } &:hover { background: var(--motor-surface-hover); } &.active { background: var(--motor-primary-soft); color: var(--motor-primary); } } }
.account-main { min-width: 0; }
.account-section :deep(.arco-form-item-extra) { color: var(--ga-text-2); }
.account-section { max-width: 760px; padding: 24px; border: 1px solid var(--motor-border); border-radius: var(--motor-radius-lg); background: var(--motor-surface); header { margin-bottom: 24px; h3 { margin: 0 0 8px; } p { margin: 0; color: var(--motor-text-2); } } }
.account-differences { max-width: 760px; color: var(--motor-text-2); font-size: 12px; line-height: 1.7; }
@media (max-width: 767px) { .account-page { padding: 16px; } .account-workspace { grid-template-columns: 1fr; } .account-hero { flex-direction: row; flex-wrap: wrap; align-items: center; } .account-navigation { display: flex; button { justify-content: center; padding: 12px 8px; span { flex: initial; } > svg:last-child { display: none; } } } .account-section { padding: 16px; } }
</style>
