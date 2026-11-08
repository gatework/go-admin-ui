<template>
  <div id="tags-view-container" class="tags-view-container" :class="`tabs-${preferences.tabStyle}`" @wheel.capture="wheelTabs" @keydown.delete="closeFocusedTag">
    <AppTabs :active-key="$route.fullPath" :type="preferences.tabStyle === 'plain' ? 'line' : preferences.tabStyle === 'card' ? 'card-gutter' : 'card'" size="small" editable hide-content @change="selectTab" @delete="closeSelectedTag">
      <a-tab-pane v-for="item in visitedViews" :key="item.fullPath" :closable="!isAffix(item)">
        <template #title>
          <AppDropdown trigger="contextMenu" @select="tagAction($event, item)">
            <span class="tags-view-item" :title="routeTitle(item)" :draggable="preferences.tabDraggable" @dragstart="dragged = item.fullPath" @dragover.prevent @drop.prevent="moveTab(item)" @auxclick="middleClose($event, item)"><MenuIcon v-if="preferences.tabShowIcon && item.meta?.icon" :name="item.meta.icon" /><span class="tags-view-label">{{ routeTitle(item) }}</span></span>
            <template #content>
              <a-doption value="refresh">{{ $t('layout.tagsView.refresh') }}</a-doption>
              <a-doption v-if="!isAffix(item)" value="close">{{ $t('layout.tagsView.close') }}</a-doption>
              <a-doption value="others">{{ $t('layout.tagsView.closeOthers') }}</a-doption>
              <a-doption value="all">{{ $t('layout.tagsView.closeAll') }}</a-doption>
            </template>
          </AppDropdown>
        </template>
      </a-tab-pane>
    </AppTabs>
    <AppDropdown v-if="preferences.tabShowMore" trigger="click" @select="tagAction($event, $route)">
      <HeaderIconButton :tooltip="$t('settings.layout.tabs.more')"><icon-more /></HeaderIconButton>
      <template #content><a-doption value="refresh">{{ $t('layout.tagsView.refresh') }}</a-doption><a-doption value="others">{{ $t('layout.tagsView.closeOthers') }}</a-doption><a-doption value="all">{{ $t('layout.tagsView.closeAll') }}</a-doption></template>
    </AppDropdown>
    <HeaderIconButton v-if="preferences.tabShowMaximize" :tooltip="$t('settings.layout.tabs.maximize')" @click="$emit('maximize')"><icon-fullscreen /></HeaderIconButton>
  </div>
</template>

<script>
import MenuIcon from '@/components/MenuIcon/index.vue'
import { usePreferencesStore } from '@/stores/preferences'
import HeaderIconButton from '@/components/header-icon-button/index.vue'
import AppDropdown from '@/components/AppDropdown/index.vue'
import AppTabs from '@/components/AppTabs/index.vue'
import { mapState } from 'pinia'
import path from 'path'
import { useSettingsStore } from '@/stores/settings'
import { useTagsViewStore } from '@/stores/tagsView'
import { usePermissionStore } from '@/stores/permission'
import { routeTitle } from '@/lang/backend'

export default {
  components: { MenuIcon, AppDropdown, AppTabs, HeaderIconButton },
  emits: ['maximize'],
  setup() { return { preferences: usePreferencesStore() } },
  data() {
    return {
      editableTabsValue: '/',
      dragged: '',
      selectedTag: {},
      affixTags: []
    }
  },
  computed: {
    ...mapState(useTagsViewStore, ['visitedViews']),
    ...mapState(usePermissionStore, ['routes']),
    ...mapState(useSettingsStore, ['theme'])
  },
  watch: {
    $route() { this.addTags() },
    'preferences.tabMaxCount'() { this.trimTabs() },
    'preferences.tabPersist'() { this.saveViews() }

  },
  mounted() {
    this.beforeUnload()
    this.initTags()
    this.addTags()
    this.isActive()
  },
  beforeUnmount() {
    this.saveViews()
    window.removeEventListener('beforeunload', this.saveViews)
  },
  methods: {
    // The store copies `title` into each visited view when the tab is opened,
    // so an open tab would otherwise keep the title it had in the old
    // language. Reading through routeTitle uses the view's `name` and `meta` --
    // both of which the copy preserves -- so open tabs follow a switch too.
    routeTitle,
    // 刷新前缓存tab
    saveViews() {
      if (!this.preferences.tabPersist) { try { sessionStorage.removeItem('tabViews') } catch { /* Storage unavailable. */ } return }
      const views = this.visitedViews.map(({ fullPath, hash, meta, name, params, path, query, title }) => ({ fullPath, hash, meta: { ...meta }, name, params: { ...params }, path, query: { ...query }, title }))
      try { sessionStorage.setItem('tabViews', JSON.stringify(views)) } catch { /* Storage unavailable. */ }
    },
    beforeUnload() {
      window.addEventListener('beforeunload', this.saveViews)
      const store = useTagsViewStore()
      if (store.restored) return
      store.restored = true
      try {
        const views = this.preferences.tabPersist ? JSON.parse(sessionStorage.getItem('tabViews') || '[]') : []
        if (Array.isArray(views)) useTagsViewStore().setVisitedViews(views.filter(view => typeof view?.fullPath === 'string' && view.fullPath.startsWith('/') && !view.fullPath.startsWith('//') && this.$router.resolve(view.fullPath).matched.length))
      } catch { /* Damaged or unavailable storage starts with current routes. */ }
    },
    wheelTabs(event) {
      // Arco owns the scroll offset, arrows and active-tab positioning.
      if (!this.preferences.tabWheelable && event.target.closest('.arco-tabs-nav-tab')) event.stopPropagation()
    },
    async closeFocusedTag(event) {
      if (!event.target.classList.contains('arco-tabs-tab')) return
      const tabs = Array.from(this.$el.querySelectorAll('.arco-tabs-tab'))
      const item = this.visitedViews[tabs.indexOf(event.target)]
      if (!item || this.isAffix(item)) return
      event.preventDefault()
      await this.closeSelectedTag(item)
      await this.$nextTick()
      this.$el.querySelector('.arco-tabs-tab-active')?.focus()
    },
    moveTab(item) {
      if (!this.preferences.tabDraggable || !this.dragged) return
      const views = [...this.visitedViews]
      const from = views.findIndex(view => view.fullPath === this.dragged)
      const to = views.findIndex(view => view.fullPath === item.fullPath)
      if (from < 0 || to < 0 || from === to) return
      views.splice(to, 0, views.splice(from, 1)[0])
      useTagsViewStore().setVisitedViews(views)
      this.saveViews()
    },
    middleClose(event, item) {
      if (event.button === 1 && this.preferences.tabMiddleClickClose && !this.isAffix(item)) { event.preventDefault(); this.closeSelectedTag(item) }
    },
    selectTab(key) { this.$router.push(key) },
    tagAction(action, item) {
      this.selectedTag = item
      if (action === 'refresh') this.refreshSelectedTag(item)
      if (action === 'close') this.closeSelectedTag(item)
      if (action === 'others') this.closeOthersTags()
      if (action === 'all') this.closeAllTags(item)
    },
    isActive() {
      const index = this.visitedViews.findIndex(item => item.fullPath === this.$route.fullPath)
      const pathIndex = index > -1 ? index : 0
      this.editableTabsValue = this.visitedViews[pathIndex]?.fullPath || this.$route.fullPath
    },
    isAffix(tag) {
      return tag.meta && tag.meta.affix
    },
    filterAffixTags(routes, basePath = '/') {
      let tags = []
      routes.forEach(route => {
        if (route.meta && route.meta.affix) {
          const tagPath = path.resolve(basePath, route.path)
          tags.push({
            fullPath: tagPath,
            path: tagPath,
            name: route.name,
            meta: { ...route.meta }
          })
        }
        if (route.children) {
          const tempTags = this.filterAffixTags(route.children, route.path)
          if (tempTags.length >= 1) {
            tags = [...tags, ...tempTags]
          }
        }
      })
      return tags
    },
    initTags() {
      const affixTags = this.affixTags = this.filterAffixTags(this.routes)
      for (const tag of affixTags) {
        // Must have tag name
        if (tag.name) {
          useTagsViewStore().addVisitedView(tag)
        }
      }
    },
    addTags() {
      const { name } = this.$route
      if (name) {
        const store = useTagsViewStore()
        store.addView(this.$route)
        this.trimTabs()
        this.isActive()
      }
      return false
    },
    trimTabs() {
      const store = useTagsViewStore()
      if (!this.preferences.tabMaxCount) return
      const closable = store.visitedViews.filter(view => !view.meta?.affix && view.path !== this.$route.path)
      while (store.visitedViews.length > this.preferences.tabMaxCount && closable.length) store.delView(closable.shift())
    },
    refreshSelectedTag(view) {
      useTagsViewStore().delCachedView(view)
      const { fullPath } = view
      this.$nextTick(() => {
        this.$router.replace({
          path: '/redirect' + fullPath
        })
      })
    },
    closeSelectedTag(view) {
      const routerPath = view.fullPath ? view.fullPath : view
      const index = this.visitedViews.findIndex(item => item.fullPath === routerPath)
      if (index > -1 && !this.isAffix(this.visitedViews[index])) {
        const path = this.visitedViews[index]
        const { visitedViews } = useTagsViewStore().delView(path)
        if (this.editableTabsValue === path.fullPath) {
          return this.toLastView(visitedViews, path)
        }
      }
    },
    closeOthersTags() {
      this.$router.push(this.selectedTag.fullPath).catch(e => e)
      useTagsViewStore().delOthersViews(this.selectedTag)
    },
    closeAllTags(view) {
      const { visitedViews } = useTagsViewStore().delAllViews()
      if (this.affixTags.some(tag => tag.path === view.path)) {
        return
      }
      this.toLastView(visitedViews, view)
    },
    toLastView(visitedViews, view) {
      const latestView = visitedViews.slice(-1)[0]
      if (latestView) {
        return this.$router.push(latestView.fullPath).catch(err => err)
      } else {
        // now the default is to redirect to the home page if there is no tags-view,
        // you can adjust it according to your needs.
        if (view.name === 'Dashboard') {
          // to reload home page
          return this.$router.replace({ path: '/redirect' + view.fullPath })
        } else {
          return this.$router.push('/')
        }
      }
    }

  }
}

</script>
<style scoped lang="scss">
.tags-view-container {
  display: flex; align-items: center; gap: 4px; width: 100%; height: 40px; padding: 6px 12px 0;
  background: var(--ga-bg-container); border-bottom: 1px solid var(--ga-border-light);
  overflow: hidden;
  :deep(.arco-tabs) { flex: 1; min-width: 0; }
  :deep(.arco-tabs-tab) { max-width: 200px; }
  :deep(.arco-tabs-tab-title) { min-width: 0; }
  .tags-view-item { display: inline-flex; max-width: 100%; align-items: center; gap: 6px; vertical-align: middle; }
  .tags-view-label { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  :deep(.arco-tabs-tab-close-btn) { display: none; flex-shrink: 0; }
  :deep(.arco-tabs-tab:hover .arco-tabs-tab-close-btn),
  :deep(.arco-tabs-tab:focus-visible .arco-tabs-tab-close-btn) { display: inline-flex; }
  :deep(.arco-tabs-nav::before) { display: none; }
}
@media (hover: none) {
  .tags-view-container :deep(.arco-tabs-tab-active .arco-tabs-tab-close-btn) { display: inline-flex; }
}
</style>
